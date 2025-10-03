# app/controller.py
from typing import Optional, List
from .models import Job, BufferLine, PlantState
from .utils import changeover_cost
import time
import heapq
import math
import uuid
import copy

class OnlineController:
    def __init__(self, plant: PlantState, params: dict = None):
        self.plant = plant
        # tunable params - defaults
        p = params or {}
        self.R_min = p.get("R_min", 6)                 # run length trigger
        self.occ_high_threshold = p.get("occ_high", 0.85)  # occupancy fraction trigger
        self.global_high_threshold = p.get("global_high", 0.9)  # percent of total buffer capacity
        self.HOLD_LIMIT = p.get("hold_limit", 30.0)    # seconds to hold at oven before forced cross-send
        self.cross_penalty = p.get("cross_penalty", 100.0)  # big penalty to discourage
        self.K_max = p.get("K_max", 20)                # max pickup in one go
        self.weights = p.get("scores", {"w_same": 10.0, "w_cross": 20.0, "w_occ": 1.0, "w_outputdown": 50.0})

    def total_capacity(self):
        return sum(b.capacity for b in self.plant.buffers.values())

    def total_occupancy(self):
        return sum(b.occupancy() for b in self.plant.buffers.values())

    def assign_job(self, job: Job, hold_at_oven_allowed=True):
        """
        Assign a job arriving from oven O1/O2 to a buffer using scoring.
        Returns assigned buffer id or None (if held).
        """
        O = job.origin
        candidates = []
        # build candidate list
        for b in self.plant.buffers.values():
            if not b.input_available:
                continue
            # check free space relative to reserve
            if b.occupancy() + b.reserve_headroom >= b.capacity:
                continue
            candidates.append(b)

        # prefer same-group buffers (for O1 prefer L1-L4)
        def is_cross_send(b: BufferLine):
            if job.origin == "O1" and int(b.id[1:]) >= 5:
                return True
            return False

        best = None
        best_score = -1e9
        for b in candidates:
            score = 0.0
            # same color grouping
            last_color = b.queue[-1].color if b.queue else None
            if last_color == job.color:
                score += self.weights["w_same"]
            # cross-send penalty
            if is_cross_send(b):
                score -= self.weights["w_cross"]
            # occupancy penalty (prefer less filled)
            occ_frac = b.occupancy() / max(1.0, b.capacity)
            score -= self.weights["w_occ"] * occ_frac
            # output down huge penalty
            if not b.output_available:
                score -= self.weights["w_outputdown"]
            # small tie-break by free space
            score += (b.free_space() / (1 + b.capacity))
            if score > best_score:
                best_score = score
                best = b

        if best:
            best.push(job)
            return best.id

        # no candidate buffers
        if hold_at_oven_allowed:
            job.hold_since = time.time()
            return None

        # forced cross-send: choose least occupied that can accept
        fallback = None
        min_occ = 1e9
        for b in self.plant.buffers.values():
            if b.occupancy() + b.reserve_headroom >= b.capacity:
                continue
            occ = b.occupancy() / b.capacity
            if occ < min_occ:
                fallback = b
                min_occ = occ
        if fallback:
            # mark that cross send happened
            fallback.push(job)
            return fallback.id

        # nowhere to put -> overflow (should not happen if using hold)
        raise RuntimeError("No buffer can accept job and holding not allowed")

    def decide_pick(self):
        """
        Decide which buffer the main conveyor should pick from right now.
        Returns (buffer_id, number_to_pick) or (None,0)
        """
        # Compute run lengths and occupancy thresholds
        candidate = None
        cand_score = -1e9
        global_occ_frac = self.total_occupancy() / max(1, self.total_capacity())

        for b in self.plant.buffers.values():
            if not b.output_available:
                continue
            occ_frac = b.occupancy() / max(1.0, b.capacity)
            R = b.head_run_length()
            # score prioritizes long runs and high occupancy
            score = (R * 2.0) + (occ_frac * 5.0)
            # safety: if occupancy critical, boost score
            if occ_frac >= self.occ_high_threshold:
                score += 50.0
            # prefer buffers with available runs
            if score > cand_score and b.occupancy() > 0:
                cand_score = score
                candidate = b

        if candidate is None:
            return (None, 0)

        # apply trigger rules
        R = candidate.head_run_length()
        occ_frac = candidate.occupancy() / candidate.capacity
        if R >= self.R_min or occ_frac >= self.occ_high_threshold or global_occ_frac >= self.global_high_threshold:
            # pick min of run length and K_max
            n = min(R if R>0 else 1, self.K_max)
            # if run length short but occupancy critical, pick some vehicles anyway
            if R == 0 and occ_frac >= self.occ_high_threshold:
                n = min(max(1, int(candidate.capacity * 0.2)), self.K_max)
            return (candidate.id, n)
        # else don't pick
        return (None, 0)

    def execute_pick(self, buffer_id: str, n: int, operator="controller"):
        """
        Pop n jobs from buffer and log it as a main conveyor trip (simulate painting).
        """
        b = self.plant.buffers[buffer_id]
        picked = b.pop_n(n)
        if picked:
            ts = time.time()
            self.plant.main_conveyor_history.append({
                "ts": ts,
                "buffer": buffer_id,
                "n": len(picked),
                "colors": [p.color for p in picked],
                "operator": operator
            })
        return picked

    def emergency_release_held(self, held_jobs: List[Job]):
        """
        Force assign held jobs after hold limit reached (cross-sends allowed)
        """
        results = []
        for job in held_jobs:
            # force assign ignoring preference (least occupied)
            fallback = None
            min_occ = 1e9
            for b in self.plant.buffers.values():
                if b.occupancy() + b.reserve_headroom >= b.capacity:
                    continue
                occ = b.occupancy() / b.capacity
                if occ < min_occ:
                    fallback = b
                    min_occ = occ
            if fallback:
                fallback.push(job)
                results.append((job.id, fallback.id))
        return results

    def local_improve(self, max_swaps=100):
        """
        Cheap local search: try swaps to increase head-run-lengths.
        Very lightweight: only swap tail items across buffers if improves head-run at some buffer.
        """
        improved = 0
        buffers = list(self.plant.buffers.values())
        for _ in range(max_swaps):
            # pick two buffers at random and try swap last elements
            import random
            b1, b2 = random.sample(buffers, 2)
            if b1.occupancy() < 1 or b2.occupancy() < 1:
                continue
            # compute effect on run-lengths if swap last items
            # For speed we only consider swapping the last items
            j1 = b1.queue[-1]
            j2 = b2.queue[-1]
            # skip if same color no benefit
            if j1.color == j2.color:
                continue
            # naive accept heuristic: if swapping makes head_run_length of either buffer larger, accept
            before = b1.head_run_length() + b2.head_run_length()
            # simulate swap
            b1.queue[-1], b2.queue[-1] = j2, j1
            after = b1.head_run_length() + b2.head_run_length()
            if after > before:
                improved += 1
            else:
                # revert
                b1.queue[-1], b2.queue[-1] = j1, j2
        return improved
