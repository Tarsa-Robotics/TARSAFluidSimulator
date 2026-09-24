"""Pure physics functions for the TARSA hose/pump sizing calculator.

Formulas implemented exactly as derived in the engineering brief
(tarsa_hose_pump_calc_prompt.md) — not re-derived or approximated differently.
No Streamlit or UI dependency; every function here is independently testable.
"""

import math

import numpy as np
from scipy.optimize import brentq

RHO_WATER = 1000.0  # kg/m^3
G = 9.81  # m/s^2

# Dynamic viscosity of water (Pa*s) at standard reference temperatures (CRC).
_MU_TEMPS_C = np.array([0.0, 10.0, 20.0, 30.0, 40.0])
_MU_VALUES = np.array([1.787e-3, 1.307e-3, 1.002e-3, 0.7975e-3, 0.6529e-3])

# Outer-solver brackets for lockable variables, per the brief.
BRACKETS = {
    "id_m": (0.003, 0.05),
    "L_m": (1.0, 200.0),
    "H_m": (0.0, 150.0),
    "dP_rated_pa": (50_000.0, 700_000_000.0),
    "Q_m3s": (1e-5, 1e-2),
}


def mu_water(T_celsius):
    """Dynamic viscosity of water (Pa*s), interpolated over ~0-40 C."""
    return float(np.interp(T_celsius, _MU_TEMPS_C, _MU_VALUES))


def hose_area(id_m):
    return (np.pi / 4.0) * id_m**2


def hose_velocity(Q_m3s, id_m):
    return Q_m3s / hose_area(id_m)


def reynolds_number(v, id_m, mu, rho):
    return rho * v * id_m / mu


def _swamee_jain_guess(Re, id_m, roughness_m):
    rel_rough = roughness_m / id_m
    denom = np.log10(rel_rough / 3.7 + 5.74 / Re**0.9)
    return 0.25 / denom**2


def friction_factor(Re, id_m, roughness_m):
    """Darcy friction factor: laminar exact, turbulent via Colebrook-White."""
    if Re < 2300:
        return 64.0 / Re

    rel_rough = roughness_m / id_m

    def colebrook(f):
        return 1.0 / np.sqrt(f) + 2.0 * np.log10(
            rel_rough / 3.7 + 2.51 / (Re * np.sqrt(f))
        )

    f_guess = _swamee_jain_guess(Re, id_m, roughness_m)
    lo, hi = max(1e-8, f_guess / 50.0), min(1.0, f_guess * 50.0)
    if colebrook(lo) * colebrook(hi) > 0:
        # Guess-based bracket failed to straddle the root — fall back to the
        # full physically-valid range, where Colebrook is monotonic.
        lo, hi = 1e-8, 1.0
    return brentq(colebrook, lo, hi)


def friction_loss_dP(f, L_m, id_m, rho, v):
    return f * (L_m / id_m) * (rho * v**2 / 2.0)


def elevation_loss_dP(H_m, rho, g):
    return rho * g * H_m


def exit_velocity(dP_effective_pa, rho, Cv):
    if dP_effective_pa <= 0:
        return 0.0
    return Cv * np.sqrt(2.0 * dP_effective_pa / rho)


def jet_reaction_force(rho, Q_m3s, v_exit):
    return rho * Q_m3s * v_exit


def burst_margin(p_burst_pa, p_rated_pa):
    return p_burst_pa / p_rated_pa


def hydraulic_power(Q_m3s, dP_rated_pa):
    """Hydraulic power the pump must deliver at rated pressure and flow (W).

    This is the fluid power output (P = Q * dP), not shaft/motor power — a
    real drive motor needs more than this to cover the pump's mechanical and
    volumetric losses, which aren't modeled here.
    """
    return Q_m3s * dP_rated_pa


def hose_mass_total(weight_per_m, length_m):
    return weight_per_m * length_m


def water_mass_total(id_m, length_m, rho=RHO_WATER):
    """Mass of water filling the hose's internal volume (not the hose itself)."""
    return rho * hose_area(id_m) * length_m


def velocity_band(v_hose):
    if v_hose < 4.0:
        return "ideal"
    if v_hose <= 6.0:
        return "acceptable"
    return "erosion_risk"


# ---------------------------------------------------------------------------
# Stage 7 — local impact pressure at glass, via footprint-area spreading.
# P_local = F_jet / A_footprint. Two independent mechanisms grow the
# footprint as the jet travels: (1) the nozzle's designed spray angle
# (geometric spreading — dominant once the angle exceeds the jet's natural
# turbulent spread, roughly theta >= 15 deg at these standoffs), and (2)
# turbulent free-jet entrainment, which widens the jet even at theta=0
# ("pencil" mode). The effective footprint area is whichever mechanism
# predicts the larger area — geometric spreading wins at typical operating
# standoffs (200mm+) once theta is past its natural-spread angle; the
# turbulent term only matters as a floor near theta=0.
#
# The geometric formulas originate the cone/fan from the nozzle's finite
# exit size, not a mathematical point: A_footprint = pi*(r_nozzle +
# standoff*tan(theta/2))^2 for cone, width = b_nozzle +
# 2*standoff*tan(theta/2) for fan. A point-origin model (r_nozzle = 0) blows
# up wrong at small standoff — as standoff -> 0 it predicts a footprint
# smaller than the nozzle's own exit, i.e. f_geometric = A_nozzle/A_footprint
# > 1, which is physically impossible: the footprint can never shrink below
# the exit that's producing it, no matter how close you get. r_nozzle (and,
# for fan, b_nozzle) come from continuity, A_nozzle = Q/v_exit — real
# geometry, not a tunable.
#
# Cone/round pattern: A = pi*(r_nozzle + standoff*tan(theta/2))^2 — at large
# standoff the r_nozzle term is negligible and area grows as standoff^2, so
# P_local decays as 1/standoff^2.
# Flat/fan pattern: width = b_nozzle + 2*standoff*tan(theta/2), area = width
# x a roughly constant impact-strip length L_strip — at large standoff area
# grows ~linearly, so P_local decays as 1/standoff. This is the real
# physical reason a fan nozzle holds pressure over distance better than a
# cone.
#
# Turbulent floor, from classical free-jet decay (Rajaratnam): round jets
# u_c/u0 = 6.2*D/x, flat jets u_c/u0 = 2.4*sqrt(b/x). Momentum flux
# (rho*u^2*A) is conserved along a free jet, so the equivalent turbulent
# footprint area is A0 / (u_c/u0)^2 — and because A0 = pi*D^2/4 (round) or
# A0 = b*L_strip (fan) by definition of the orifice, D and b cancel out of
# that ratio algebraically, leaving a floor that depends only on standoff
# (and, for fan, the strip length). This floor formula is a far-field
# asymptotic approximation, not meant to be evaluated near standoff = 0 —
# but it doesn't need to be: the corrected geometric term already floors at
# A_nozzle there, so the max() of the two stays physical at every standoff.
# ---------------------------------------------------------------------------
K_ROUND_TURB = 6.2
K_FLAT_TURB = 5.76  # = 2.4^2, from u_c/u0 = 2.4*sqrt(b/x)
L_STRIP_MM_DEFAULT = 25.0  # fan slot's impact-strip length at exit — assumed, not sourced
P_THRESHOLD_PA_DEFAULT = 800_000.0  # 8 bar, Kim et al. proven floor


def footprint_area_mm2(pattern, standoff_mm, spray_angle_deg, nozzle_area_mm2=0.0,
                        L_strip_mm=L_STRIP_MM_DEFAULT):
    """nozzle_area_mm2 = the nozzle exit's real cross-sectional area (from
    continuity, Q/v_exit) — defaults to 0 (mathematical point origin) only
    for callers that don't have it, e.g. exploring the pure decay shape."""
    tan_half = np.tan(np.radians(spray_angle_deg) / 2.0)
    if pattern == "fan":
        b_nozzle_mm = nozzle_area_mm2 / L_strip_mm if L_strip_mm > 0 else 0.0
        width_footprint = b_nozzle_mm + 2.0 * standoff_mm * tan_half
        geometric = width_footprint * L_strip_mm
        turbulent_floor = (standoff_mm / K_FLAT_TURB) * L_strip_mm
        return max(geometric, turbulent_floor)
    r_nozzle_mm = np.sqrt(nozzle_area_mm2 / np.pi)
    r_footprint = r_nozzle_mm + standoff_mm * tan_half
    geometric = np.pi * r_footprint**2
    turbulent_floor = (np.pi * standoff_mm**2) / (4.0 * K_ROUND_TURB**2)
    return max(geometric, turbulent_floor)


def local_impact_pressure(F_jet_n, footprint_mm2):
    if footprint_mm2 <= 0:
        return 0.0
    return F_jet_n / (footprint_mm2 * 1e-6)  # N / m^2 = Pa


# ---------------------------------------------------------------------------
# Stage 8 — cleaning verdict.
# ---------------------------------------------------------------------------
def cleaning_ratio(p_local_pa, p_threshold_pa):
    return p_local_pa / p_threshold_pa if p_threshold_pa else float("inf")


def cleaning_verdict(r):
    if r >= 2.0:
        return "green"
    if r >= 1.0:
        return "yellow"
    return "red"


def forward_solve(inputs: dict) -> dict:
    """Run the full chain given all inputs; return every output + flags."""
    id_m = inputs["id_m"]
    L_m = inputs["L_m"]
    H_m = inputs["H_m"]
    Q_m3s = inputs["Q_m3s"]
    dP_rated_pa = inputs["dP_rated_pa"]
    Cv = inputs.get("Cv", 1.0)
    roughness_m = inputs.get("roughness_m", 0.005e-3)
    T_celsius = inputs.get("T_celsius", 20.0)
    weight_per_m = inputs.get("weight_per_m", 0.0)
    p_burst_pa = inputs.get("p_burst_pa", 0.0)
    standoff_mm = inputs.get("standoff_mm", 200.0)
    spray_angle_deg = inputs.get("spray_angle_deg", 40.0)
    nozzle_pattern = inputs.get("nozzle_pattern", "cone")
    L_strip_mm = inputs.get("L_strip_mm", L_STRIP_MM_DEFAULT)
    p_threshold_pa = inputs.get("p_threshold_pa", P_THRESHOLD_PA_DEFAULT)

    mu = mu_water(T_celsius)
    v_hose = hose_velocity(Q_m3s, id_m)
    Re = reynolds_number(v_hose, id_m, mu, RHO_WATER)
    f = friction_factor(Re, id_m, roughness_m)
    dP_friction = friction_loss_dP(f, L_m, id_m, RHO_WATER, v_hose)
    dP_elevation = elevation_loss_dP(H_m, RHO_WATER, G)
    dP_effective = dP_rated_pa - dP_friction - dP_elevation
    feasible = dP_effective > 0

    v_exit = exit_velocity(dP_effective, RHO_WATER, Cv)
    F_jet = jet_reaction_force(RHO_WATER, Q_m3s, v_exit)

    v_exit_structural = exit_velocity(dP_rated_pa * 2.0, RHO_WATER, Cv)
    F_jet_structural = jet_reaction_force(RHO_WATER, Q_m3s, v_exit_structural)

    margin = burst_margin(p_burst_pa, dP_rated_pa) if dP_rated_pa else float("inf")

    # Mass uses H (suspended length), not L (total flow-path length): the
    # hose hangs straight from a ground-based reel up to the robot, so the
    # portion actually loading the cables is the vertical climb, not the
    # full flow length (any slack beyond H sits coiled at the base).
    hose_mass = hose_mass_total(weight_per_m, H_m)
    water_mass = water_mass_total(id_m, H_m)

    hydraulic_power_w = hydraulic_power(Q_m3s, dP_rated_pa)

    # Nozzle exit area from continuity (Q = A*v), in mm^2 — real geometry,
    # not a tunable. 0 when infeasible (v_exit=0): footprint value doesn't
    # matter there since F_jet=0 makes P_local 0 regardless.
    nozzle_area_mm2 = (Q_m3s / v_exit) * 1e6 if v_exit > 0 else 0.0
    footprint_mm2 = footprint_area_mm2(nozzle_pattern, standoff_mm, spray_angle_deg, nozzle_area_mm2, L_strip_mm)
    p_local_pa = local_impact_pressure(F_jet, footprint_mm2)
    cleaning_r = cleaning_ratio(p_local_pa, p_threshold_pa)
    cleaning_verdict_val = cleaning_verdict(cleaning_r)

    return {
        "mu": mu,
        "v_hose": v_hose,
        "Re": Re,
        "f": f,
        "dP_friction": dP_friction,
        "dP_elevation": dP_elevation,
        "dP_effective": dP_effective,
        "feasible": feasible,
        "v_exit": v_exit,
        "F_jet": F_jet,
        "F_jet_structural": F_jet_structural,
        "burst_margin": margin,
        "burst_pass": margin >= 2.0,
        "velocity_band": velocity_band(v_hose),
        "hose_mass": hose_mass,
        "water_mass": water_mass,
        "total_suspended_mass": hose_mass + water_mass,
        "hydraulic_power_w": hydraulic_power_w,
        "footprint_mm2": footprint_mm2,
        "P_local_pa": p_local_pa,
        "cleaning_R": cleaning_r,
        "cleaning_verdict": cleaning_verdict_val,
    }


def solve_for(unknown_var: str, target_metric: str, target_value: float,
              fixed_inputs: dict, bracket: tuple = None) -> float:
    """Generic outer root-finder: vary unknown_var to hit target_value."""
    lo, hi = bracket if bracket is not None else BRACKETS[unknown_var]

    def objective(x):
        inputs = dict(fixed_inputs)
        inputs[unknown_var] = x
        return forward_solve(inputs)[target_metric] - target_value

    return brentq(objective, lo, hi)


def solve_for_2(var_a: str, var_b: str, metric_a: str, target_a: float,
                 metric_b: str, target_b: float, fixed_inputs: dict) -> dict:
    """Solve 2 unknowns against 2 simultaneous targets — a 2x2 nonlinear
    system. Deliberately NOT a multi-dimensional Newton-Raphson: instead,
    nested bisection built entirely out of the proven 1D solve_for/brentq
    primitives. One variable (outer) is root-found; for each candidate
    outer value, the other variable (inner) is solved exactly via the
    existing 1D solve_for to hit its assigned target; the outer root-find
    then drives its own target to zero. This keeps brentq's
    guaranteed-convergence-given-a-bracketing-sign-change property at both
    levels, rather than introducing a method that can silently diverge.

    Not every (var_a, var_b, metric_a, metric_b) combination is solvable —
    e.g. burst_margin depends only on dP_rated_pa among the 5 lockable
    inputs, so targeting it while dP_rated_pa is held fixed is genuinely
    infeasible, not a solver bug. Which variable plays outer vs inner, and
    which variable is assigned to which target, both affect whether a given
    nested formulation happens to satisfy the sign-change precondition — so
    all 4 (2 metric-assignments x 2 outer/inner role choices) are tried
    before giving up.
    """

    def attempt(outer_var, outer_metric, outer_target, inner_var, inner_metric, inner_target):
        lo, hi = BRACKETS[outer_var]

        def g(outer_value):
            outer_fixed = dict(fixed_inputs)
            outer_fixed[outer_var] = outer_value
            inner_value = solve_for(inner_var, inner_metric, inner_target, outer_fixed)
            final_inputs = dict(outer_fixed)
            final_inputs[inner_var] = inner_value
            return forward_solve(final_inputs)[outer_metric] - outer_target

        outer_value = brentq(g, lo, hi)
        outer_fixed = dict(fixed_inputs)
        outer_fixed[outer_var] = outer_value
        inner_value = solve_for(inner_var, inner_metric, inner_target, outer_fixed)
        return {outer_var: outer_value, inner_var: inner_value}

    attempts = [
        lambda: attempt(var_a, metric_a, target_a, var_b, metric_b, target_b),
        lambda: attempt(var_a, metric_b, target_b, var_b, metric_a, target_a),
        lambda: attempt(var_b, metric_a, target_a, var_a, metric_b, target_b),
        lambda: attempt(var_b, metric_b, target_b, var_a, metric_a, target_a),
    ]

    last_error = None
    for try_attempt in attempts:
        try:
            return try_attempt()
        except ValueError as e:
            last_error = e

    raise ValueError(
        f"solve_for_2: no solution for {{{metric_a}={target_a}, {metric_b}={target_b}}} "
        f"varying {{{var_a}, {var_b}}}. This combination may not be solvable "
        f"(e.g. a target that doesn't depend on either unlocked input). "
        f"Last attempt: {last_error}"
    )


# ---------------------------------------------------------------------------
# Cable drum sizing
# ---------------------------------------------------------------------------
# N layers of n turns each; the turn in layer k (0-based) sits on centerline
# radius r + d/2 + k*d, so summing the N layers gives the closed form
# 2*pi*n*N*(r + N*d/2). The small epsilon keeps float noise (e.g.
# 0.3/0.01 = 29.999...) from dropping or adding a whole turn.
_DRUM_EPS = 1e-9


def drum_turns_per_layer(W_m, d_m):
    return math.floor(W_m / d_m + _DRUM_EPS)


def drum_capacity(r_m, W_m, d_m, layers):
    n = drum_turns_per_layer(W_m, d_m)
    return 2 * math.pi * n * layers * (r_m + layers * d_m / 2)


def drum_solve_radius(L_m, d_m, layers, W_m):
    """Drum length fixed -> barrel radius that just fits L_m of cable."""
    n = drum_turns_per_layer(W_m, d_m)
    if n < 1:
        return {"r_m": math.nan, "turns_per_layer": n, "feasible": False}
    r_m = L_m / (2 * math.pi * n * layers) - layers * d_m / 2
    return {"r_m": r_m, "turns_per_layer": n, "feasible": r_m > 0}


def drum_solve_length(L_m, d_m, layers, r_m):
    """Barrel radius fixed -> shortest drum (whole turns) that fits L_m."""
    per_turn = 2 * math.pi * layers * (r_m + layers * d_m / 2)
    n = max(1, math.ceil(L_m / per_turn - _DRUM_EPS))
    return {"W_m": n * d_m, "turns_per_layer": n}


def drum_forward(inputs: dict) -> dict:
    """Single entry point for the drum tab, mirroring forward_solve's role.
    `solve` names the unknown: "r" (W given), "W" (r given), or "L" (r and W
    given -> cable capacity)."""
    d_m, layers, solve = inputs["d_m"], inputs["layers"], inputs["solve"]
    L_m, r_m, W_m = inputs.get("L_m"), inputs.get("r_m"), inputs.get("W_m")
    feasible = True
    if solve == "r":
        res = drum_solve_radius(L_m, d_m, layers, W_m)
        r_m, feasible = res["r_m"], res["feasible"]
    elif solve == "W":
        W_m = drum_solve_length(L_m, d_m, layers, r_m)["W_m"]
        feasible = r_m > 0
    elif solve == "L":
        L_m = drum_capacity(r_m, W_m, d_m, layers)
        feasible = r_m > 0 and drum_turns_per_layer(W_m, d_m) >= 1
    else:
        raise ValueError(f"drum_forward: unknown solve target {solve}")
    n = drum_turns_per_layer(W_m, d_m)
    return {
        "L_m": L_m,
        "r_m": r_m,
        "W_m": W_m,
        "outer_radius_m": r_m + layers * d_m,
        "turns_per_layer": n,
        "total_turns": n * layers,
        "capacity_m": drum_capacity(r_m, W_m, d_m, layers) if feasible else math.nan,
        "feasible": feasible,
    }
