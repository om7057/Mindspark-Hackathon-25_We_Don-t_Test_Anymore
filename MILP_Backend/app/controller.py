# app/controller.py
from typing import Optional, List, Deque
from collections import deque
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
        self.occ_high_threshold = p.get("occ_high", 0.95)  # occupancy fraction trigger
        self.global_high_threshold = p.get("global_high", 0.9)  # percent of total buffer capacity
        self.HOLD_LIMIT = p.get("hold_limit", 30.0)    # seconds to hold at oven before forced cross-send
        self.cross_penalty = p.get("cross_penalty", 100.0)  # big penalty to discourage
        self.K_max = p.get("K_max", 20)                # max pickup in one go
        self.weights = p.get("scores", {"w_same": 10.0, "w_cross": 20.0, "w_occ": 1.0, "w_outputdown": 50.0})
        
        # Drain mode state
        self.drain_mode = False
        self.drain_plan: Deque[dict] = deque()
        self.use_milp_for_drain = True
        self.milp_horizon_per_call = 300  # Increased from 200
        self.drain_picks_since_replan = 0
        self.drain_replan_threshold = 10  # Replan after this many picks
        
        # Enhanced drain parameters
        self.drain_params = {
            "color_continuity_bonus": 100.0,  # Huge bonus for continuing same color
            "run_value_per_job": 15.0,        # Value per job in run
            "chain_value_per_buffer": 20.0,   # Value when other buffers have same color
            "lookahead_value_per_job": 5.0,   # Value for jobs in next run
            "occupancy_pressure": 10.0,       # Pressure to drain fuller buffers
            "rarity_bonus_max": 30.0,         # Max bonus for rare colors
        }

    def total_capacity(self):
        return sum(b.capacity for b in self.plant.buffers.values())

    def total_occupancy(self):
        return sum(b.occupancy() for b in self.plant.buffers.values())

    def assign_job(self, job: Job, hold_at_oven_allowed=True):
        """
        Assign a job arriving from oven O1/O2 to a buffer using STRICT policy:
         - O2 -> only L5-L9 (hard rule)
         - O1 -> prefer L1-L4; allow L5-L9 ONLY as emergency when holding would exceed HOLD_LIMIT
        Returns assigned buffer id or None (if held).
        """
        O = job.origin

        # helper: buffer id -> numeric index (1..9)
        def buf_idx(bid: str):
            try:
                return int(bid[1:])
            except Exception:
                return None

        # Build primary candidate set according to oven rules
        primary_candidates = []
        fallback_candidates = []  # for emergency cross-send

        for b in self.plant.buffers.values():
            if not b.input_available:
                continue
            # check free space relative to reserve
            if b.occupancy() + b.reserve_headroom >= b.capacity:
                continue
            idx = buf_idx(b.id)
            if O == "O2":
                # O2 allowed only to L5-L9 (STRICT)
                if idx is not None and idx >= 5:
                    primary_candidates.append(b)
                # O2 cannot send to L1-L4 ever
            elif O == "O1":
                # O1 prefers L1-L4; these are primary
                if idx is not None and idx <= 4:
                    primary_candidates.append(b)
                else:
                    # L5-L9 are fallback (cross-send) candidates only
                    fallback_candidates.append(b)
            else:
                # unknown oven, allow any (defensive)
                primary_candidates.append(b)

        # Score function
        def is_cross_send(b: BufferLine):
            return (job.origin == "O1" and buf_idx(b.id) is not None and buf_idx(b.id) >= 5)

        def score_buffer_list(candidate_list):
            best = None
            best_score = -1e9
            for b in candidate_list:
                score = 0.0
                last_color = b.queue[-1].color if b.queue else None
                
                # STRATEGY 1: Same color bonus (existing)
                if last_color == job.color:
                    score += self.weights["w_same"]
                
                # STRATEGY 2: Building runs - if buffer has multiple of same color, prioritize it
                if last_color == job.color and len(b.queue) > 0:
                    # Count how many of this color at the tail
                    tail_run = 1
                    for idx in range(len(b.queue) - 2, -1, -1):
                        if b.queue[idx].color == last_color:
                            tail_run += 1
                        else:
                            break
                    score += tail_run * 2.0  # Bonus for extending existing runs
                
                # STRATEGY 3: Cross-send penalty (existing)
                if is_cross_send(b):
                    score -= self.weights["w_cross"]
                
                # STRATEGY 4: Occupancy-based scoring - prefer less full buffers
                occ_frac = b.occupancy() / max(1.0, b.capacity)
                score -= self.weights["w_occ"] * occ_frac
                
                # STRATEGY 5: Output availability (existing)
                if not b.output_available:
                    score -= self.weights["w_outputdown"]
                
                # STRATEGY 6: Free space bonus (existing)
                score += (b.free_space() / (1 + b.capacity))
                
                # STRATEGY 7: Color diversity penalty - avoid mixing too many colors in one buffer
                unique_colors = len(set(j.color for j in b.queue))
                if unique_colors > 3:  # More than 3 colors is suboptimal
                    score -= (unique_colors - 3) * 5.0
                
                if score > best_score:
                    best_score = score
                    best = b
            return best, best_score

        # First try primary candidates (strict rules)
        if primary_candidates:
            best_buf, _ = score_buffer_list(primary_candidates)
            if best_buf:
                best_buf.push(job)
                job._cross_send_emergency = False
                return best_buf.id

        # No primary candidate available -> either hold or emergency cross-send
        if hold_at_oven_allowed:
            job.hold_since = time.time()
            job._cross_send_emergency = False
            return None

        # If holding not allowed, allow fallback cross-send (O1 only!)
        if fallback_candidates:
            best_buf, _ = score_buffer_list(fallback_candidates)
            if best_buf:
                best_buf.push(job)
                job._cross_send_emergency = True
                return best_buf.id

        # Last resort: try any buffer
        last_resort = None
        min_occ = 1e9
        for b in self.plant.buffers.values():
            if b.occupancy() + b.reserve_headroom >= b.capacity:
                continue
            occ = b.occupancy() / b.capacity
            if occ < min_occ:
                last_resort = b
                min_occ = occ
        if last_resort:
            last_resort.push(job)
            job._cross_send_emergency = (buf_idx(last_resort.id) is not None and buf_idx(last_resort.id) >= 5 and job.origin=="O1")
            return last_resort.id

        # Nowhere to put -> overflow
        raise RuntimeError("No buffer can accept job and holding not allowed")

    def enter_drain_mode(self, use_milp: Optional[bool] = None):
        """
        Switch controller to drain mode: compute an offline drain plan.
        Returns plan summary.
        """
        self.drain_mode = True
        if use_milp is None:
            use_milp = self.use_milp_for_drain

        # Collect all remaining jobs
        job_list = []
        for b in self.plant.buffers.values():
            job_list.extend(list(b.queue))

        if not job_list:
            self.drain_plan = deque()
            return {"status": "empty", "plan_len": 0}

        # Try MILP planner
        if use_milp:
            try:
                from .milp_benchmark import milp_short_horizon
                milp_res = milp_short_horizon(job_list, self.plant.buffers, 
                                             horizon_slots=min(len(job_list), self.milp_horizon_per_call))
                if milp_res.get("status") == "ok" and milp_res.get("sequence"):
                    seq = milp_res["sequence"]
                    # Compress sequence into pick commands
                    plan = []
                    for s in seq:
                        if not plan or plan[-1]["buffer"] != s["buffer"]:
                            plan.append({"buffer": s["buffer"], "n": 1})
                        else:
                            plan[-1]["n"] += 1
                    self.drain_plan = deque(plan)
                    return {"status": "milp_plan", "plan_len": len(self.drain_plan)}
            except Exception as e:
                pass  # Fall back to greedy

        # Enhanced greedy drain planner with multi-strategy optimization
        plan = []
        local_queues = {bid: [job.color for job in b.queue] for bid, b in self.plant.buffers.items()}
        
        last_color = None  # Track last picked color for continuity
        
        while any(q for q in local_queues.values() if q):
            best_bid = None
            best_score = -1e9
            best_run = 0
            
            for bid, q in local_queues.items():
                if not q:
                    continue
                
                head_color = q[0]
                
                # Calculate head run length
                r = 1
                for col in q[1:]:
                    if col == head_color:
                        r += 1
                    else:
                        break
                
                # STRATEGY 1: Color Continuity - MASSIVE bonus for same color as last pick
                color_continuity = self.drain_params["color_continuity_bonus"] if (last_color and head_color == last_color) else 0.0
                
                # STRATEGY 2: Run Length Value - prefer longer runs
                run_value = r * self.drain_params["run_value_per_job"]
                
                # STRATEGY 3: Chaining Potential - check if other buffers have same color
                same_color_buffers = sum(1 for other_bid, other_q in local_queues.items() 
                                        if other_bid != bid and other_q and other_q[0] == head_color)
                chaining_potential = same_color_buffers * self.drain_params["chain_value_per_buffer"]
                
                # STRATEGY 4: Look-Ahead - what comes after this run?
                next_color_after_run = q[r] if r < len(q) else None
                next_run_length = 0
                if next_color_after_run:
                    for col in q[r:]:
                        if col == next_color_after_run:
                            next_run_length += 1
                        else:
                            break
                look_ahead_value = next_run_length * self.drain_params["lookahead_value_per_job"]
                
                # STRATEGY 5: Occupancy Pressure - drain fuller buffers first
                occ_frac = len(q) / max(1, self.plant.buffers[bid].capacity)
                occupancy_pressure = occ_frac * self.drain_params["occupancy_pressure"]
                
                # STRATEGY 6: Color Rarity - prioritize rare colors (finish them quickly)
                total_of_color = sum(colors.count(head_color) for colors in local_queues.values())
                rarity_bonus = (1.0 / (total_of_color + 1)) * self.drain_params["rarity_bonus_max"]
                
                # Combined score with all strategies
                score = (color_continuity + 
                        run_value + 
                        chaining_potential + 
                        look_ahead_value + 
                        occupancy_pressure + 
                        rarity_bonus)
                
                if score > best_score:
                    best_score = score
                    best_bid = bid
                    best_run = r
            
            if best_bid is None:
                break
            
            # Pick the entire run (up to K_max)
            to_pick = min(best_run, self.K_max)
            plan.append({"buffer": best_bid, "n": to_pick})
            
            # Update state
            last_color = local_queues[best_bid][0]
            local_queues[best_bid] = local_queues[best_bid][to_pick:]
        
        self.drain_plan = deque(plan)
        return {"status": "enhanced_greedy_plan", "plan_len": len(self.drain_plan)}

    def exit_drain_mode(self):
        """Turn off drain mode and clear plan."""
        self.drain_mode = False
        self.drain_plan = deque()

    def decide_pick(self):
        """
        Modified decide_pick: if in drain_mode, execute plan entries with dynamic replanning.
        Otherwise behave like normal with look-ahead optimization.
        """
        # Drain-mode behavior with dynamic replanning
        if self.drain_mode:
            # Check if we should replan (every N picks or when plan is empty)
            remaining_jobs = self.total_occupancy()
            
            if self.drain_picks_since_replan >= self.drain_replan_threshold and remaining_jobs > 5:
                # Replan with greedy (fast) for remaining jobs
                print(f"[DRAIN] Dynamic replanning with {remaining_jobs} jobs remaining (picks since last plan: {self.drain_picks_since_replan})")
                job_list = []
                for b in self.plant.buffers.values():
                    job_list.extend(list(b.queue))
                if job_list:
                    # Quick greedy replan (no MILP overhead)
                    plan = []
                    local_queues = {bid: [job.color for job in b.queue] for bid, b in self.plant.buffers.items()}
                    last_history = self.plant.main_conveyor_history
                    last_color = last_history[-1]["colors"][-1] if last_history and last_history[-1]["colors"] else None
                    
                    # Use enhanced greedy with current context
                    self.drain_plan = self._enhanced_greedy_with_context(local_queues, last_color)
                    self.drain_picks_since_replan = 0
                    print(f"[DRAIN] Replanned: {len(self.drain_plan)} steps remaining")
            
            if self.drain_plan:
                next_item = self.drain_plan.popleft()
                b_id = next_item["buffer"]
                n = min(next_item["n"], self.plant.buffers[b_id].occupancy())
                if n <= 0:
                    return self.decide_pick()  # Skip empty buffer and continue
                self.drain_picks_since_replan += 1
                return (b_id, n)
            else:
                # No plan left: immediate greedy draining with look-ahead
                candidate = None
                cand_score = -1e9
                last_painted_color = self._get_last_painted_color()
                
                for b in self.plant.buffers.values():
                    if not b.output_available:
                        continue
                    R = b.head_run_length()
                    occ_frac = b.occupancy() / max(1, b.capacity)
                    
                    head_color = b.queue[0].color if b.queue else None
                    
                    # Color continuity bonus
                    color_bonus = 50.0 if (head_color and head_color == last_painted_color) else 0.0
                    
                    # Look-ahead: check if next color after run matches other buffers
                    next_color_bonus = self._calculate_next_color_bonus(b, R)
                    
                    score = R * 2.0 + occ_frac * 5.0 + color_bonus + next_color_bonus
                    if score > cand_score and b.occupancy() > 0:
                        cand_score = score
                        candidate = b
                if candidate:
                    n = min(candidate.head_run_length() if candidate.head_run_length()>0 else 1, self.K_max)
                    return (candidate.id, n)
                return (None, 0)

        # Normal-mode behavior
        candidate = None
        cand_score = -1e9
        global_occ_frac = self.total_occupancy() / max(1, self.total_capacity())
        last_painted_color = self._get_last_painted_color()

        for b in self.plant.buffers.values():
            if not b.output_available:
                continue
            occ_frac = b.occupancy() / max(1.0, b.capacity)
            R = b.head_run_length()
            
            # Get head color
            head_color = b.queue[0].color if b.queue else None
            
            # STRATEGY 1: Color continuity bonus - prefer same color as last painted
            color_continuity_bonus = 0
            if head_color and head_color == last_painted_color:
                color_continuity_bonus = 20.0  # Big bonus for continuing same color
            
            # STRATEGY 2: Look-ahead bonus - check if picking this creates good future opportunities
            next_color_bonus = self._calculate_next_color_bonus(b, R)
            
            # STRATEGY 3: Cross-buffer color matching - check if other buffers have same color
            cross_buffer_bonus = self._calculate_cross_buffer_bonus(head_color)
            
            # Combined score with advanced strategies
            score = (R * 2.0) + (occ_frac * 5.0) + color_continuity_bonus + next_color_bonus + cross_buffer_bonus
            
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

    def _get_last_painted_color(self):
        """Get the last color that was painted (from main conveyor history)."""
        if not self.plant.main_conveyor_history:
            return None
        last_entry = self.plant.main_conveyor_history[-1]
        if last_entry.get("colors"):
            return last_entry["colors"][-1]  # Last color in last pick
        return None

    def _calculate_next_color_bonus(self, buffer: BufferLine, current_run_length: int):
        """
        Look-ahead strategy: Check what color comes after the current run.
        If it matches another buffer's head, give bonus (we can chain picks).
        """
        if current_run_length >= buffer.occupancy():
            return 0  # No jobs after current run
        
        # Get color that comes after current run
        next_color = buffer.queue[current_run_length].color if current_run_length < len(buffer.queue) else None
        if not next_color:
            return 0
        
        # Check if any other buffer has this color at the head
        for other_buffer in self.plant.buffers.values():
            if other_buffer.id == buffer.id:
                continue
            if other_buffer.queue and other_buffer.queue[0].color == next_color:
                # Found matching color in another buffer - this is good for chaining
                return 10.0
        return 0

    def _calculate_cross_buffer_bonus(self, color: str):
        """
        Cross-buffer strategy: If multiple buffers have the same color available,
        give bonus (we can create longer combined runs).
        """
        if not color:
            return 0
        
        matching_buffers = 0
        total_matching_jobs = 0
        
        for b in self.plant.buffers.values():
            if b.queue and b.queue[0].color == color:
                matching_buffers += 1
                # Count how many of this color at the head
                run = b.head_run_length()
                total_matching_jobs += run
        
        # Bonus increases with more buffers having same color
        if matching_buffers > 1:
            return matching_buffers * 5.0 + (total_matching_jobs * 0.5)
        return 0

    def _enhanced_greedy_with_context(self, local_queues: dict, last_color: str = None):
        """
        Enhanced greedy planner that can be called with current context for replanning.
        Returns a deque of pick commands.
        """
        plan = []
        
        while any(q for q in local_queues.values() if q):
            best_bid = None
            best_score = -1e9
            best_run = 0
            
            for bid, q in local_queues.items():
                if not q:
                    continue
                
                head_color = q[0]
                
                # Calculate head run length
                r = 1
                for col in q[1:]:
                    if col == head_color:
                        r += 1
                    else:
                        break
                
                # Multi-strategy scoring
                color_continuity = self.drain_params["color_continuity_bonus"] if (last_color and head_color == last_color) else 0.0
                run_value = r * self.drain_params["run_value_per_job"]
                
                same_color_buffers = sum(1 for other_bid, other_q in local_queues.items() 
                                        if other_bid != bid and other_q and other_q[0] == head_color)
                chaining_potential = same_color_buffers * self.drain_params["chain_value_per_buffer"]
                
                next_color_after_run = q[r] if r < len(q) else None
                next_run_length = 0
                if next_color_after_run:
                    for col in q[r:]:
                        if col == next_color_after_run:
                            next_run_length += 1
                        else:
                            break
                look_ahead_value = next_run_length * self.drain_params["lookahead_value_per_job"]
                
                occ_frac = len(q) / max(1, self.plant.buffers[bid].capacity)
                occupancy_pressure = occ_frac * self.drain_params["occupancy_pressure"]
                
                total_of_color = sum(colors.count(head_color) for colors in local_queues.values())
                rarity_bonus = (1.0 / (total_of_color + 1)) * self.drain_params["rarity_bonus_max"]
                
                score = (color_continuity + run_value + chaining_potential + 
                        look_ahead_value + occupancy_pressure + rarity_bonus)
                
                if score > best_score:
                    best_score = score
                    best_bid = bid
                    best_run = r
            
            if best_bid is None:
                break
            
            to_pick = min(best_run, self.K_max)
            plan.append({"buffer": best_bid, "n": to_pick})
            
            last_color = local_queues[best_bid][0]
            local_queues[best_bid] = local_queues[best_bid][to_pick:]
        
        return deque(plan)
