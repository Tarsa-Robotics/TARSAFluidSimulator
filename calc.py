"""Pure physics functions for the TARSA hose/pump sizing calculator.

Formulas implemented exactly as derived in the engineering brief
(tarsa_hose_pump_calc_prompt.md) — not re-derived or approximated differently.
No Streamlit or UI dependency; every function here is independently testable.
"""

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
    "dP_rated_pa": (50_000.0, 3_000_000.0),
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
