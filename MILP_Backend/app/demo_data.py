# app/demo_data.py
from .models import BufferLine, PlantState
from .utils import DEFAULT_CAPS

def default_plant():
    buffers = {}
    for i in range(1, 5):
        buffers[f"L{i}"] = BufferLine(id=f"L{i}", capacity=DEFAULT_CAPS[f"L{i}"], reserve_headroom=0)
    for i in range(5, 10):
        buffers[f"L{i}"] = BufferLine(id=f"L{i}", capacity=DEFAULT_CAPS[f"L{i}"], reserve_headroom=1)
    plant = PlantState(buffers=buffers)
    return plant
