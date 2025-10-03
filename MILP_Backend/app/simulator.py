# app/simulator.py
import simpy
import random
import time
from typing import Callable, List
from .models import Job, BufferLine, PlantState
from .utils import sample_color
from .controller import OnlineController
from .demo_data import default_plant
import uuid

class PlantSim:
    def __init__(self, env: simpy.Environment, plant: PlantState, controller: OnlineController,
                 o1_rate=6.0, o2_rate=6.0, max_time=3600):
        """
        o1_rate, o2_rate are average inter-arrival times in seconds (exponential)
        """
        self.env = env
        self.plant = plant
        self.controller = controller
        self.o1_rate = o1_rate
        self.o2_rate = o2_rate
        self.max_time = max_time
        self.held_jobs = []  # jobs waiting at ovens
        self.stats = {"throughput": 0, "changeovers": 0, "overflows": 0, "cross_sends": 0}

    def oven_process(self, oven_name: str, interarrival_mean: float):
        while True:
            yield self.env.timeout(random.expovariate(1.0/interarrival_mean))
            color = sample_color()
            job = Job(id=str(uuid.uuid4()), color=color, origin=oven_name, arrival_ts=self.env.now)
            assigned = self.controller.assign_job(job, hold_at_oven_allowed=True)
            if assigned is None:
                # held at oven
                self.held_jobs.append(job)
            else:
                # assigned, if cross-sent and oven==O1 and assigned to L5..L9, count cross
                if oven_name == "O1" and int(assigned[1:]) >= 5:
                    self.stats["cross_sends"] += 1

    def held_job_monitor(self):
        """Periodically check held jobs and release if hold exceeds limit"""
        while True:
            yield self.env.timeout(1.0)
            now = self.env.now
            to_release = []
            for job in list(self.held_jobs):
                if job.hold_since and (now - job.hold_since) >= self.controller.HOLD_LIMIT:
                    to_release.append(job)
                    self.held_jobs.remove(job)
            if to_release:
                res = self.controller.emergency_release_held(to_release)
                # increment cross-sends if from O1 to L5..L9
                for jid, buf in res:
                    if job.origin == "O1" and int(buf[1:]) >= 5:
                        self.stats["cross_sends"] += 1

    def main_conveyor_worker(self):
        """Periodically ask controller to pick and simulate processing time"""
        while True:
            yield self.env.timeout(1.0)  # check every second
            buf_id, n = self.controller.decide_pick()
            if buf_id:
                picked = self.controller.execute_pick(buf_id, n)
                if picked:
                    # simulate processing time proportional to n (just a placeholder)
                    process_time = 5.0 + 0.5 * len(picked)
                    yield self.env.timeout(process_time)
                    # update stats
                    self.stats["throughput"] += len(picked)
                    # compute changeovers in this pick (internal)
                    # if previous pick exists, compare last color
                    # simple calculation:
                    if len(self.plant.main_conveyor_history) >= 2:
                        prev = self.plant.main_conveyor_history[-2]
                        cur = self.plant.main_conveyor_history[-1]
                        prev_last = prev["colors"][-1]
                        cur_first = cur["colors"][0]
                        if prev_last != cur_first:
                            self.stats["changeovers"] += 1

    def run(self, until=3600):
        env = self.env
        env.process(self.oven_process("O1", self.o1_rate))
        env.process(self.oven_process("O2", self.o2_rate))
        env.process(self.held_job_monitor())
        env.process(self.main_conveyor_worker())
        env.run(until=until)
        return self.stats
