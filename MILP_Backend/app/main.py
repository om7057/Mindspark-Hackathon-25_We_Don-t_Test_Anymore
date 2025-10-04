# app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

# Add CORS middleware to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (must be list, not string)
    allow_credentials=False,  # Must be False when using allow_origins=["*"]
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

PLANT = default_plant()
CONTROLLER = OnlineController(PLANT)

@app.get("/")
def get_check():
    return {"message":"Sequencing Backend is running."}

@app.get("/state")
def get_state():
    return {
        "buffers": {k: v.to_dict() for k, v in PLANT.buffers.items()},
        "main_history": PLANT.main_conveyor_history,
        "total_capacity": CONTROLLER.total_capacity(),
        "total_occupancy": CONTROLLER.total_occupancy(),
        "oven_states": PLANT.oven_states,
        "main_conveyor_busy": PLANT.main_conveyor_busy
    }


@app.post("/set-state")
def set_state(state):
    global PLANT, CONTROLLER
    PLANT = state
    CONTROLLER = OnlineController(PLANT)
    return {"status": "state_set"}


@app.post("/arrival")
def arrival(oven: str = "O1", color: str = None):
    if oven not in ["O1", "O2"]:
        raise HTTPException(400, "oven must be O1 or O2")
    
    # If O2 is off, reroute all jobs to O1
    original_oven = oven
    if oven == "O2" and not PLANT.oven_states.get("O2", True):
        oven = "O1"
        print(f"Oven O2 is OFF - Rerouting job from {original_oven} to O1")
    
    color = color or sample_color()
    job = Job(id=str(uuid.uuid4()), color=color, origin=oven)
    assigned = CONTROLLER.assign_job(job, hold_at_oven_allowed=True)
    
    return {
        "job_id": job.id, 
        "assigned_buffer": assigned, 
        "job": job.to_dict(),
        "original_oven": original_oven,
        "rerouted": original_oven != oven
    }


@app.post("/trigger_pick")
def trigger_pick_manual(buffer_id: str = None, n: int = 1):
    if not buffer_id:
        buffer_id, n = CONTROLLER.decide_pick()
        if not buffer_id:
            return {"status": "no_pick"}
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
    sim = PlantSim(env, plant_copy, ctrl, o1_rate=o1_rate,
                   o2_rate=o2_rate, max_time=seconds)
    stats = sim.run(until=seconds)
    return {"stats": stats, "final_buffers": {k: v.to_dict() for k, v in plant_copy.buffers.items()}}


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
    return {"status": "reset"}


@app.post("/enter_drain")
def enter_drain(use_milp: bool = True):
    """
    Signal the controller to switch to drain mode and compute an optimal drain plan.
    use_milp: attempt MILP planning; if False or MILP fails, will use greedy planner.
    """
    try:
        res = CONTROLLER.enter_drain_mode(use_milp=use_milp)
        return {"status": "drain_mode_entered", "detail": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/exit_drain")
def exit_drain():
    """Exit drain mode and return to normal operation."""
    CONTROLLER.exit_drain_mode()
    return {"status": "drain_mode_exited"}


@app.get("/drain_status")
def drain_status():
    """Get current drain mode status."""
    return {
        "drain_mode": getattr(CONTROLLER, "drain_mode", False),
        "plan_len": len(getattr(CONTROLLER, "drain_plan", []))
    }


@app.post("/toggle_oven")
def toggle_oven(oven_id: str):
    """Toggle oven state (only O2 can be toggled, O1 is always on)."""
    if oven_id not in ["O1", "O2"]:
        raise HTTPException(400, "oven_id must be O1 or O2")
    
    # O1 cannot be toggled - it's always on
    if oven_id == "O1":
        raise HTTPException(400, "Oven O1 cannot be toggled - it is always active")
    
    # Only O2 can be toggled
    current_state = PLANT.oven_states.get(oven_id, True)
    PLANT.oven_states[oven_id] = not current_state
    
    return {
        "status": "success",
        "oven_id": oven_id,
        "new_state": PLANT.oven_states[oven_id],
        "message": f"Oven {oven_id} {'activated' if PLANT.oven_states[oven_id] else 'deactivated'}"
    }


@app.post("/toggle_buffer")
def toggle_buffer(buffer_id: str, field: str = "input_available"):
    """Toggle buffer input or output availability."""
    if buffer_id not in PLANT.buffers:
        raise HTTPException(404, f"Buffer {buffer_id} not found")
    
    if field not in ["input_available", "output_available"]:
        raise HTTPException(400, "field must be 'input_available' or 'output_available'")
    
    buffer = PLANT.buffers[buffer_id]
    current_value = getattr(buffer, field)
    setattr(buffer, field, not current_value)
    
    return {
        "status": "success",
        "buffer_id": buffer_id,
        "field": field,
        "new_state": getattr(buffer, field),
        "message": f"Buffer {buffer_id} {field.replace('_', ' ')} {'enabled' if getattr(buffer, field) else 'disabled'}"
    }


@app.post("/set_buffer_state")
def set_buffer_state(buffer_id: str, input_available: bool = None, output_available: bool = None):
    """Set buffer input and/or output availability states."""
    if buffer_id not in PLANT.buffers:
        raise HTTPException(404, f"Buffer {buffer_id} not found")
    
    buffer = PLANT.buffers[buffer_id]
    
    if input_available is not None:
        buffer.input_available = input_available
    if output_available is not None:
        buffer.output_available = output_available
    
    return {
        "status": "success",
        "buffer_id": buffer_id,
        "input_available": buffer.input_available,
        "output_available": buffer.output_available
    }


@app.post("/toggle_main_conveyor")
def toggle_main_conveyor():
    """Toggle main conveyor busy state."""
    PLANT.main_conveyor_busy = not PLANT.main_conveyor_busy
    
    return {
        "status": "success",
        "new_state": PLANT.main_conveyor_busy,
        "message": f"Main conveyor {'blocked' if PLANT.main_conveyor_busy else 'unblocked'}"
    }
