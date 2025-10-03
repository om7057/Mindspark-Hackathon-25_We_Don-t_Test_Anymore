# app/milp_benchmark.py
from ortools.sat.python import cp_model
from typing import List, Dict, Tuple
from .models import Job, BufferLine, PlantState
from .utils import changeover_cost
import math

def milp_short_horizon(jobs: List[Job], buffers: Dict[str, BufferLine], horizon_slots: int = 50):
    """
    Simple CP-SAT to sequence up to horizon_slots jobs from heads of buffers.
    We model pick slots 0..horizon_slots-1; at most one buffer chosen per slot.
    Each job can be scheduled at most once (we only consider current head-run aggregated jobs).
    This is a simplified benchmark: aggregate-level to compute sequence minimizing changeovers.
    """
    # Prepare candidate items: for each buffer, take up to K items from head preserving order
    K = 10
    items = []  # (buffer_id, color)
    from copy import deepcopy
    for b in buffers.values():
        for i, job in enumerate(b.queue[:K]):
            items.append((b.id, job.color, job.id))

    if not items:
        return {"status": "no_items"}

    model = cp_model.CpModel()
    S = len(items)
    T = min(horizon_slots, S)

    x = {}  # x[t,s] = 1 if we schedule item s at time t
    for t in range(T):
        for s in range(S):
            x[(t,s)] = model.NewBoolVar(f"x_t{t}_s{s}")

    # each slot picks at most one item
    for t in range(T):
        model.Add(sum(x[(t,s)] for s in range(S)) <= 1)

    # each item scheduled at most once
    for s in range(S):
        model.Add(sum(x[(t,s)] for t in range(T)) <= 1)

    # preserve per-buffer precedence for items from same buffer: if item s1 before s2 in buffer,
    # then time(s1) < time(s2) if both scheduled. Encode via ordering variables using big-M style.
    # Create integer var pos_s: position in schedule (0..T)
    pos = {}
    for s in range(S):
        pos[s] = model.NewIntVar(0, T, f"pos_{s}")
        # link pos with x: pos_s == sum_t t * x[t,s] + (1 - scheduled)*T
        # create helper ints
    # We'll create scheduled flag
    scheduled = {}
    for s in range(S):
        scheduled[s] = model.NewBoolVar(f"scheduled_{s}")
        model.Add(sum(x[(t,s)] for t in range(T)) == scheduled[s])
        # pos constraints: if scheduled then pos in 0..T-1 else pos==T
        model.Add(pos[s] < T).OnlyEnforceIf(scheduled[s])
        model.Add(pos[s] == T).OnlyEnforceIf(scheduled[s].Not())

        # linking pos to x: pos == sum t*x[t,s] (only valid if scheduled)
        # Implement with linear constraint using int vars
        # Introduce pos_expr as linear combination
        model.Add(sum(t * x[(t,s)] for t in range(T)) == pos[s]).OnlyEnforceIf(scheduled[s])

    # precedence constraints per buffer
    from collections import defaultdict
    buf_items = defaultdict(list)
    for idx, (bid, color, jid) in enumerate(items):
        buf_items[bid].append(idx)
    for bid, s_list in buf_items.items():
        for i in range(len(s_list)-1):
            s1 = s_list[i]
            s2 = s_list[i+1]
            # if both scheduled then pos[s1] < pos[s2]
            model.Add(pos[s1] < pos[s2]).OnlyEnforceIf([scheduled[s1], scheduled[s2]])

    # objective: minimize total changeovers (color changes) in scheduled sequence
    # We approximate: add variables prev_color_change[t] that indicate color change between slot t-1 and t
    # We'll linearize by computing color at each slot via indicator variables.
    colors = list({c for _, c, _ in items})
    color_idx = {c:i for i,c in enumerate(colors)}
    C = len(colors)

    y = {}  # y[t,c] = 1 if slot t has color c
    for t in range(T):
        for c in range(C):
            y[(t,c)] = model.NewBoolVar(f"y_t{t}_c{c}")
        # link y with x: y[t,c] == sum_s [x[t,s] & item_color==c]
        for c_idx, c in enumerate(colors):
            model.Add(sum(x[(t,s)] for s in range(S) if items[s][1] == c) == y[(t,c)])

    # Ensure at most one color per slot
    for t in range(T):
        model.Add(sum(y[(t,c)] for c in range(C)) <= 1)

    # compute changeovers: z[t] = 1 if slot t and t-1 exist and color differs
    z = {}
    for t in range(1, T):
        z[t] = model.NewBoolVar(f"z_{t}")
        # z[t] >= y[t,c] - y[t-1,c] for any c when they differ. Use linearization:
        # For all pairs of colors c1,c2 with c1!=c2: if y[t,c1]==1 and y[t-1,c2]==1 then z[t]==1
        # Simpler relaxation: z[t] >= sum_c y[t,c] + sum_c y[t-1,c] - 2*same_color_match
        # We'll implement exact: z[t] >= y[t,c1] + y[t-1,c2] for any c1!=c2 minus 1
        # Instead, compute same_color[t] = sum_c (y[t,c] & y[t-1,c]) and z[t] = scheduled_t_minus1_and_t - same_color
        scheduled_t = model.NewBoolVar(f"scheduled_t{t}")
        scheduled_t_minus = model.NewBoolVar(f"scheduled_t{t-1}")
        model.Add(sum(x[(t,s)] for s in range(S)) == scheduled_t)
        model.Add(sum(x[(t-1,s)] for s in range(S)) == scheduled_t_minus)
        same_color = model.NewBoolVar(f"same_color_{t}")
        # same_color => exists c with y[t,c]==1 and y[t-1,c]==1
        # force same_color == 1 if any c satisfies both y vars
        # same_color <= sum_c y[t,c] ; same_color <= sum_c y[t-1,c]; and for each c, same_color >= y[t,c] + y[t-1,c] -1
        model.Add(same_color <= sum(y[(t,c)] for c in range(C)))
        model.Add(same_color <= sum(y[(t-1,c)] for c in range(C)))
        for c in range(C):
            model.Add(same_color >= y[(t,c)] + y[(t-1,c)] - 1)

        # z[t] is 1 iff both scheduled and not same_color
        model.Add(z[t] >= scheduled_t)
        model.Add(z[t] >= scheduled_t_minus)
        model.Add(z[t] <= scheduled_t)
        model.Add(z[t] <= scheduled_t_minus)
        # z[t] <= 1 - same_color + bigM*(1 - both_scheduled)
        # enforce: if both scheduled and same_color==1 -> z==0 ; if both scheduled and same_color==0 -> z==1
        model.Add(z[t] + same_color >= scheduled_t)  # when scheduled_t=1 and scheduled_t_minus=1 and same_color=0 -> z>=1
        model.Add(z[t] <= 1 - same_color + (1 - scheduled_t) + (1 - scheduled_t_minus))

    # objective: minimize sum z[t] (changeovers) and maximize scheduled items
    obj_terms = []
    for t in range(1, T):
        obj_terms.append(z[t])
    # penalize unscheduled items lightly so solver schedules more
    for s in range(S):
        obj_terms.append((1 - scheduled[s]) * 0.01)  # 0.01 penalty per unscheduled

    model.Minimize(sum(obj_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10.0
    solver.parameters.num_search_workers = 8
    res = solver.Solve(model)
    if res == cp_model.OPTIMAL or res == cp_model.FEASIBLE:
        seq = []
        for t in range(T):
            for s in range(S):
                if solver.Value(x[(t,s)]) == 1:
                    seq.append({
                        "time_slot": t,
                        "buffer": items[s][0],
                        "color": items[s][1],
                        "job_id": items[s][2]
                    })
        return {"status": "ok", "sequence": seq}
    else:
        return {"status": "infeasible"}
