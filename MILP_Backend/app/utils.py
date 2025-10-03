# app/utils.py
from typing import Dict
import random

# colors and approximate distribution
COLOR_DISTRIBUTION = {
    "C1": 0.40,
    "C2": 0.25,
    "C3": 0.12,
    "C4": 0.08,
    "C5": 0.03,
    "C6": 0.02,
    "C7": 0.02,
    "C8": 0.02,
    "C9": 0.02,
    "C10": 0.02,
    "C11": 0.02,
    "C12": 0.01
}

def sample_color():
    colors = list(COLOR_DISTRIBUTION.keys())
    probs = list(COLOR_DISTRIBUTION.values())
    return random.choices(colors, weights=probs, k=1)[0]

# changeover cost: simple function (1 if different else 0) scaled by weight
def changeover_cost(c1: str, c2: str) -> float:
    return 1.0 if c1 != c2 else 0.0

# default capacities
DEFAULT_CAPS = {
    "L1": 14, "L2": 14, "L3": 14, "L4": 14,
    "L5": 16, "L6": 16, "L7": 16, "L8": 16, "L9": 16
}
