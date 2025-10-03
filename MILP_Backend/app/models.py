# app/models.py
from typing import Optional, List
from dataclasses import dataclass, field
from enum import Enum
import time
import uuid

@dataclass
class Job:
    id: str
    color: str
    origin: str  # 'O1' or 'O2'
    arrival_ts: float = field(default_factory=time.time)
    assigned_buffer: Optional[str] = None
    hold_since: Optional[float] = None

    def to_dict(self):
        return {
            "id": self.id,
            "color": self.color,
            "origin": self.origin,
            "arrival_ts": self.arrival_ts,
            "assigned_buffer": self.assigned_buffer,
            "hold_since": self.hold_since
        }

@dataclass
class BufferLine:
    id: str
    capacity: int
    queue: List[Job] = field(default_factory=list)
    input_available: bool = True
    output_available: bool = True
    reserve_headroom: int = 0  # reserved slots for emergency cross-sends

    def occupancy(self):
        return len(self.queue)

    def free_space(self):
        return self.capacity - self.occupancy() - self.reserve_headroom

    def push(self, job: Job):
        if self.occupancy() + self.reserve_headroom >= self.capacity:
            raise ValueError(f"Buffer {self.id} overflow")
        self.queue.append(job)
        job.assigned_buffer = self.id

    def pop_n(self, n=1):
        popped = []
        for _ in range(min(n, self.occupancy())):
            popped.append(self.queue.pop(0))
        return popped

    def head_run_length(self):
        if not self.queue:
            return 0
        head_color = self.queue[0].color
        cnt = 0
        for j in self.queue:
            if j.color == head_color:
                cnt += 1
            else:
                break
        return cnt

    def to_dict(self):
        return {
            "id": self.id,
            "capacity": self.capacity,
            "occupancy": self.occupancy(),
            "input_available": self.input_available,
            "output_available": self.output_available,
            "queue": [j.to_dict() for j in self.queue],
            "reserve_headroom": self.reserve_headroom
        }

@dataclass
class PlantState:
    buffers: dict = field(default_factory=dict)  # id -> BufferLine
    oven_states: dict = field(default_factory=lambda: {"O1": True, "O2": True})
    main_conveyor_busy: bool = False
    main_conveyor_history: List[dict] = field(default_factory=list)  # logs
