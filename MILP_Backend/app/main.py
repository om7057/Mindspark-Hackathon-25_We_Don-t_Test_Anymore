# app/main.py
from fastapi import FastAPI, HTTPException
from .demo_data import default_plant
from .controller import OnlineController
from .simulator import PlantSim
from .milp_benchmark import milp_short_horizon
from .models import Job
import simpy
import uuid
from .utils import sample_color
from typing import Dict

app = FastAPI(title="Smart Sequencing Backend")

PLANT = default_plant()
CONTROLLER = OnlineController(PLANT)

@app.get("/state")
def get_state():
    return {
        "buffers": {k:v.to_dict() for k,v in PLANT.buffers.items()},
        "main_history": PLANT.main_conveyor_history,
        "total_capacity": CONTROLLER.total_capacity(),
        "total_occupancy": CONTROLLER.total_occupancy()
    }

@app.post("/arrival")
def arrival(oven: str = "O1", color: str = None):
    if oven not in ["O1", "O2"]:
        raise HTTPException(400, "oven must be O1 or O2")
    color = color or sample_color()
    job = Job(id=str(uuid.uuid4()), color=color, origin=oven)
    assigned = CONTROLLER.assign_job(job, hold_at_oven_allowed=True)
    return {"job_id": job.id, "assigned_buffer": assigned, "job": job.to_dict()}

@app.post("/trigger_pick")
def trigger_pick_manual(buffer_id: str = None, n: int = 1):
    if not buffer_id:
        buffer_id, n = CONTROLLER.decide_pick()
        if not buffer_id:
            return {"status":"no_pick"}
    picked = CONTROLLER.execute_pick(buffer_id, n, operator="manual")
    return {"picked_n": len(picked), "colors": [p.color for p in picked]}

@app.post("/run_sim")
def run_sim(seconds: int = 3600, o1_rate: float = 6.0, o2_rate: float = 6.0):
    env = simpy.Environment()
    # clone plant to avoid mutating global state
    import copy
    plant_copy = copy.deepcopy(PLANT)
    ctrl = OnlineController(plant_copy, params={
        "R_min": CONTROLLER.R_min,
        "occ_high": CONTROLLER.occ_high_threshold,
        "global_high": CONTROLLER.global_high_threshold,
        "hold_limit": CONTROLLER.HOLD_LIMIT,
        "K_max": CONTROLLER.K_max
    })
    sim = PlantSim(env, plant_copy, ctrl, o1_rate=o1_rate, o2_rate=o2_rate, max_time=seconds)
    stats = sim.run(until=seconds)
    return {"stats": stats, "final_buffers": {k:v.to_dict() for k,v in plant_copy.buffers.items()}}

@app.post("/milp")
def run_milp(horizon_slots: int = 50):
    # run MILP on current plant heads
    jobs = []
    for b in PLANT.buffers.values():
        for job in b.queue:
            jobs.append(job)
    res = milp_short_horizon(jobs, PLANT.buffers, horizon_slots=horizon_slots)
    return res

@app.post("/reset")
def reset():
    global PLANT, CONTROLLER
    PLANT = default_plant()
    CONTROLLER = OnlineController(PLANT)
    return {"status":"reset"}
