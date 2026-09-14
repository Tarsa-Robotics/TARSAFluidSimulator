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

    hose_mass = hose_mass_total(weight_per_m, L_m)
    water_mass = water_mass_total(id_m, L_m)

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
