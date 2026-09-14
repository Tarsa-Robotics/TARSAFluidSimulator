"""Acceptance-gate pytest suite for calc.py — must pass before app.py is trusted.

Reproduces the Comet P40 worked example, the Kim et al. independent cross-check,
the three hose-ID velocity-band cases, the laminar branch, and a Colebrook
turbulent sanity case (verified against the Haaland explicit approximation,
not hand-read off a chart — see note on test_friction_factor_turbulent_colebrook).
"""

import math

import numpy as np
import pytest

import calc

RHO = calc.RHO_WATER


# ---------------------------------------------------------------------------
# Comet P40 worked example (300 psi electric-start / 290 psi pull-start)
# ---------------------------------------------------------------------------

PSI_TO_PA = 6894.757293168361
Q_P40 = 7.2554e-4  # m^3/s, 11.5 GPM


def test_p40_worked_example_300psi():
    dP_rated = 2_068_427.0  # Pa, as given in the brief for 300 psi
    v_exit = calc.exit_velocity(dP_rated, RHO, Cv=1.0)
    F_jet = calc.jet_reaction_force(RHO, Q_P40, v_exit)
    assert v_exit == pytest.approx(64.3, rel=0.01)
    assert F_jet == pytest.approx(46.7, rel=0.01)


def test_p40_worked_example_290psi_pull_start():
    dP_rated = 290 * PSI_TO_PA
    v_exit = calc.exit_velocity(dP_rated, RHO, Cv=1.0)
    F_jet = calc.jet_reaction_force(RHO, Q_P40, v_exit)
    assert v_exit == pytest.approx(63.2, rel=0.01)
    assert F_jet == pytest.approx(45.9, rel=0.01)


# ---------------------------------------------------------------------------
# Kim et al. (PLOS ONE 2020) independent cross-check — different regime,
# validates the exit-velocity formula itself, not the P40-specific numbers.
# ---------------------------------------------------------------------------

def test_kim_et_al_cross_check():
    dP = 800_000.0  # Pa, 8 bar / 116 psi
    v_exit = calc.exit_velocity(dP, RHO, Cv=1.0)
    assert v_exit == pytest.approx(40.0, rel=0.01)


# ---------------------------------------------------------------------------
# Hose velocity at P40 flow — three ID bands
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("id_mm, expected_v, expected_band", [
    (9.5, 10.2, "erosion_risk"),
    (12.7, 5.7, "acceptable"),
    (15.9, 3.7, "ideal"),
])
def test_hose_velocity_bands(id_mm, expected_v, expected_band):
    v = calc.hose_velocity(Q_P40, id_mm / 1000.0)
    # The brief's own targets are rounded to 1 decimal; a 1.5% tolerance
    # absorbs that rounding without masking a real formula error.
    assert v == pytest.approx(expected_v, rel=0.015)
    assert calc.velocity_band(v) == expected_band


# ---------------------------------------------------------------------------
# Friction factor — laminar branch
# ---------------------------------------------------------------------------

def test_friction_factor_laminar():
    Re = 1500.0
    f = calc.friction_factor(Re, id_m=0.02, roughness_m=0.005e-3)
    assert f == pytest.approx(64.0 / Re, rel=1e-9)


# ---------------------------------------------------------------------------
# Friction factor — turbulent Colebrook branch
# ---------------------------------------------------------------------------

def _haaland_f(Re, rel_rough):
    """Haaland explicit approximation to Colebrook-White (~1-2% accurate) —
    used here as an independent reference to sanity-check our Colebrook
    root-find, rather than hardcoding a hand-read Moody-chart value."""
    inv_sqrt_f = -1.8 * math.log10((rel_rough / 3.7) ** 1.11 + 6.9 / Re)
    return 1.0 / inv_sqrt_f**2


def test_friction_factor_turbulent_colebrook():
    Re = 1e5
    rel_rough = 0.001
    id_m = 0.05
    roughness_m = rel_rough * id_m
    f = calc.friction_factor(Re, id_m, roughness_m)
    f_haaland = _haaland_f(Re, rel_rough)
    assert f == pytest.approx(f_haaland, rel=0.02)
    # Sanity range consistent with standard Moody-chart tables for this pair.
    assert 0.020 < f < 0.024


def test_friction_factor_turbulent_converges_and_solves_colebrook_exactly():
    """The returned f must actually satisfy the implicit Colebrook equation."""
    Re = 5e4
    id_m = 0.03
    roughness_m = 0.0002
    f = calc.friction_factor(Re, id_m, roughness_m)
    rel_rough = roughness_m / id_m
    lhs = 1.0 / np.sqrt(f)
    rhs = -2.0 * np.log10(rel_rough / 3.7 + 2.51 / (Re * np.sqrt(f)))
    assert lhs == pytest.approx(rhs, rel=1e-6)


# ---------------------------------------------------------------------------
# forward_solve — end-to-end feasibility flag
# ---------------------------------------------------------------------------

def test_forward_solve_infeasible_when_losses_exceed_rated_pressure():
    result = calc.forward_solve({
        "id_m": 0.0095,
        "L_m": 100.0,
        "H_m": 100.0,
        "Q_m3s": Q_P40,
        "dP_rated_pa": 50_000.0,  # deliberately too low
        "Cv": 1.0,
        "roughness_m": 0.005e-3,
        "T_celsius": 20.0,
    })
    assert result["feasible"] is False
    assert result["v_exit"] == 0.0


# ---------------------------------------------------------------------------
# Water mass — hose weight must stay separate from the water it carries
# ---------------------------------------------------------------------------

def test_water_mass_total_matches_hand_computed_volume():
    id_m = 0.0159  # 5/8"
    L_m = 30.0
    expected = calc.RHO_WATER * (math.pi / 4.0) * id_m**2 * L_m
    assert calc.water_mass_total(id_m, L_m) == pytest.approx(expected, rel=1e-9)


def test_forward_solve_total_suspended_mass_is_hose_plus_water():
    inputs = {
        "id_m": 0.0159,
        "L_m": 30.0,
        "H_m": 0.0,
        "Q_m3s": Q_P40,
        "dP_rated_pa": 2_068_427.0,
        "Cv": 1.0,
        "roughness_m": 0.005e-3,
        "T_celsius": 20.0,
        "weight_per_m": 0.22,
    }
    result = calc.forward_solve(inputs)
    assert result["hose_mass"] == pytest.approx(0.22 * 30.0)
    assert result["water_mass"] == pytest.approx(
        calc.water_mass_total(0.0159, 30.0)
    )
    assert result["total_suspended_mass"] == pytest.approx(
        result["hose_mass"] + result["water_mass"]
    )
    # Hose mass must never silently include water.
    assert result["hose_mass"] != pytest.approx(result["total_suspended_mass"])
