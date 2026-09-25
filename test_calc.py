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
    """Mass is driven by H (suspended length: the hose hangs straight from
    a ground-based reel up to the robot, so only the vertical climb loads
    the cables), not L (the water's full flow-path length, which can
    exceed H due to slack coiled at the base and is unrelated to what's
    actually hanging)."""
    inputs = {
        "id_m": 0.0159,
        "L_m": 50.0,  # deliberately different from H_m, to prove mass ignores it
        "H_m": 20.0,
        "Q_m3s": Q_P40,
        "dP_rated_pa": 2_068_427.0,
        "Cv": 1.0,
        "roughness_m": 0.005e-3,
        "T_celsius": 20.0,
        "weight_per_m": 0.22,
    }
    result = calc.forward_solve(inputs)
    assert result["hose_mass"] == pytest.approx(0.22 * 20.0)
    assert result["water_mass"] == pytest.approx(
        calc.water_mass_total(0.0159, 20.0)
    )
    assert result["total_suspended_mass"] == pytest.approx(
        result["hose_mass"] + result["water_mass"]
    )
    # Hose mass must never silently include water.
    assert result["hose_mass"] != pytest.approx(result["total_suspended_mass"])
    # Changing L alone (flow-path length) must not move the mass numbers.
    inputs_longer_L = dict(inputs)
    inputs_longer_L["L_m"] = 150.0
    result_longer_L = calc.forward_solve(inputs_longer_L)
    assert result_longer_L["hose_mass"] == pytest.approx(result["hose_mass"])
    assert result_longer_L["water_mass"] == pytest.approx(result["water_mass"])


# ---------------------------------------------------------------------------
# solve_for_2 — locking 2 simultaneous targets (nested bisection)
# ---------------------------------------------------------------------------

_BASE_2D_INPUTS = {
    "id_m": 0.0159,
    "L_m": 30.0,
    "H_m": 20.0,
    "Q_m3s": Q_P40,
    "dP_rated_pa": 300 * PSI_TO_PA,
    "Cv": 1.0,
    "roughness_m": 0.005e-3,
    "T_celsius": 20.0,
    "weight_per_m": 0.22,
    "p_burst_pa": 4000 * PSI_TO_PA,
}


def test_solve_for_2_round_trip_recovers_original_inputs():
    """A solution is known to exist by construction: forward_solve the base
    inputs, then feed its own v_hose/F_jet back in as 2 targets while
    varying the same 2 inputs that produced them — must recover them."""
    baseline = calc.forward_solve(_BASE_2D_INPUTS)
    result = calc.solve_for_2(
        "id_m", "L_m", "v_hose", baseline["v_hose"], "F_jet", baseline["F_jet"],
        _BASE_2D_INPUTS,
    )
    assert result["id_m"] == pytest.approx(0.0159, rel=1e-4)
    assert result["L_m"] == pytest.approx(30.0, rel=1e-4)


def test_solve_for_2_burst_margin_requires_dP_rated_pa():
    """burst_margin depends only on dP_rated_pa among the 5 lockable
    inputs. Solving it alongside v_hose by varying {dP_rated_pa, Q_m3s}
    must succeed (dP_rated_pa can reach any burst_margin; Q_m3s can reach
    any v_hose independently)."""
    # burst_margin = p_burst_pa / dP_rated_pa; with p_burst_pa fixed at 4000
    # psi and dP_rated_pa's (effectively uncapped) bracket, 13.33 (the
    # P40-300psi default case) is comfortably achievable.
    result = calc.solve_for_2(
        "dP_rated_pa", "Q_m3s", "burst_margin", 13.33, "v_hose", 4.0,
        _BASE_2D_INPUTS,
    )
    check_inputs = dict(_BASE_2D_INPUTS)
    check_inputs["dP_rated_pa"] = result["dP_rated_pa"]
    check_inputs["Q_m3s"] = result["Q_m3s"]
    check = calc.forward_solve(check_inputs)
    assert check["burst_margin"] == pytest.approx(13.33, rel=1e-3)
    assert check["v_hose"] == pytest.approx(4.0, rel=1e-4)


def test_solve_for_2_infeasible_when_neither_variable_affects_either_target():
    """L_m and H_m affect neither burst_margin nor v_hose — every one of
    the 4 nested-bisection attempts must fail, and the failure must be a
    clear error, not a wrong answer or a hang."""
    with pytest.raises(ValueError):
        calc.solve_for_2(
            "L_m", "H_m", "burst_margin", 13.33, "v_hose", 4.0,
            _BASE_2D_INPUTS,
        )


# ---------------------------------------------------------------------------
# Stage 7 — footprint area: geometric spreading, cone vs. fan
# ---------------------------------------------------------------------------

def test_footprint_geometric_formulas():
    # Point-origin (nozzle_area_mm2=0 default) isolates the pure
    # angle/standoff decay shape.
    s, theta = 1000, 40
    tan_half = np.tan(np.radians(theta) / 2.0)
    assert calc.footprint_area_mm2("cone", s, theta) == pytest.approx(np.pi * (s * tan_half) ** 2)
    assert calc.footprint_area_mm2("fan", s, theta, 0, 25) == pytest.approx(2 * s * tan_half * 25)


def test_footprint_turbulent_floor_nonzero_at_theta_0():
    # The geometric term vanishes at theta=0; the turbulent floor must take
    # over rather than returning a zero-area (infinite-pressure) footprint.
    assert calc.footprint_area_mm2("cone", 1000, 0) > 0
    assert calc.footprint_area_mm2("fan", 1000, 0, 0, 25) > 0
    assert calc.footprint_area_mm2("cone", 1000, 0) == pytest.approx(
        (np.pi * 1000**2) / (4 * calc.K_ROUND_TURB**2)
    )
    assert calc.footprint_area_mm2("fan", 1000, 0, 0, 25) == pytest.approx(
        (1000 / calc.K_FLAT_TURB) * 25
    )


def test_footprint_cone_scales_as_standoff_squared_fan_scales_linearly():
    # At a spray angle wide enough that geometric spreading dominates (60deg),
    # a 10x standoff increase grows the cone footprint ~100x (area ~
    # standoff^2) but the fan footprint only ~10x (area ~ standoff^1) — the
    # real reason a fan nozzle holds pressure over distance better than a
    # cone.
    cone_near = calc.footprint_area_mm2("cone", 200, 60)
    cone_far = calc.footprint_area_mm2("cone", 2000, 60)
    assert cone_far / cone_near == pytest.approx(100.0, rel=0.01)

    fan_near = calc.footprint_area_mm2("fan", 200, 60, 0, 25)
    fan_far = calc.footprint_area_mm2("fan", 2000, 60, 0, 25)
    assert fan_far / fan_near == pytest.approx(10.0, rel=0.01)


# ---------------------------------------------------------------------------
# Stage 7 — finite nozzle exit size (point-origin was the actual bug)
# ---------------------------------------------------------------------------

def test_footprint_floors_at_nozzle_area_at_zero_standoff():
    # Point-origin cone/fan models predict a footprint that shrinks below
    # the nozzle's own exit area as standoff -> 0 — physically impossible,
    # since f_geometric = A_nozzle/A_footprint would exceed 1. The fix
    # originates both patterns from the real (finite) exit size instead of
    # a point: at standoff=0 the footprint must equal the nozzle's own exit
    # area exactly — not smaller, not a point.
    nozzle_area_mm2 = 50.0  # e.g. an ~8mm-diameter round orifice
    assert calc.footprint_area_mm2("cone", 0, 40, nozzle_area_mm2) == pytest.approx(nozzle_area_mm2)
    assert calc.footprint_area_mm2("fan", 0, 40, nozzle_area_mm2, 25) == pytest.approx(nozzle_area_mm2)


@pytest.mark.parametrize("s", [0, 5, 50, 200, 2000])
def test_footprint_never_below_nozzle_area(s):
    # The physical bound: footprint area can never be smaller than the
    # nozzle exit producing it, at any standoff, for either pattern.
    nozzle_area_mm2 = 50.0
    assert calc.footprint_area_mm2("cone", s, 40, nozzle_area_mm2) >= nozzle_area_mm2 - 1e-9
    assert calc.footprint_area_mm2("fan", s, 40, nozzle_area_mm2, 25) >= nozzle_area_mm2 - 1e-9


def test_footprint_converges_to_point_origin_at_large_standoff():
    nozzle_area_mm2 = 50.0
    with_nozzle = calc.footprint_area_mm2("cone", 2000, 40, nozzle_area_mm2)
    point_origin = calc.footprint_area_mm2("cone", 2000, 40)
    assert with_nozzle == pytest.approx(point_origin, rel=0.02)


# ---------------------------------------------------------------------------
# Stage 7 — local impact pressure (P_local = F_jet / A_footprint)
# ---------------------------------------------------------------------------

def test_local_impact_pressure_scales_with_force_over_area():
    assert calc.local_impact_pressure(1000.0, 1_000_000.0) == pytest.approx(1000.0)
    assert calc.local_impact_pressure(2000.0, 1_000_000.0) == pytest.approx(2000.0)


def test_local_impact_pressure_guarded_at_zero_footprint():
    assert calc.local_impact_pressure(500.0, 0) == 0.0


# ---------------------------------------------------------------------------
# Stage 8 — cleaning verdict thresholds
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("r, expected", [
    (2.0, "green"),
    (5.0, "green"),
    (1.0, "yellow"),
    (1.99, "yellow"),
    (0.99, "red"),
    (0.0, "red"),
])
def test_cleaning_verdict_thresholds(r, expected):
    assert calc.cleaning_verdict(r) == expected


def test_forward_solve_wires_up_cleaning_verdict():
    inputs = dict(_BASE_2D_INPUTS)
    inputs["standoff_mm"] = 1000
    inputs["spray_angle_deg"] = 40
    inputs["nozzle_pattern"] = "cone"
    inputs["p_threshold_pa"] = 800_000.0
    result = calc.forward_solve(inputs)
    # forward_solve derives the nozzle's real exit area from continuity
    # (Q/v_exit) and feeds it in — recompute the same way to check the wiring.
    nozzle_area_mm2 = (inputs["Q_m3s"] / result["v_exit"]) * 1e6
    expected_footprint = calc.footprint_area_mm2("cone", 1000, 40, nozzle_area_mm2)
    assert result["footprint_mm2"] == pytest.approx(expected_footprint)
    assert result["P_local_pa"] == pytest.approx(result["F_jet"] / (expected_footprint * 1e-6))
    assert result["cleaning_R"] == pytest.approx(result["P_local_pa"] / 800_000.0)
    assert result["cleaning_verdict"] == calc.cleaning_verdict(result["cleaning_R"])
    assert result["footprint_mm2"] >= nozzle_area_mm2 - 1e-6


def test_forward_solve_nozzle_pattern_defaults_to_cone():
    inputs = dict(_BASE_2D_INPUTS)
    inputs["standoff_mm"] = 1000
    inputs["spray_angle_deg"] = 40
    result = calc.forward_solve(inputs)
    nozzle_area_mm2 = (inputs["Q_m3s"] / result["v_exit"]) * 1e6
    expected_footprint = calc.footprint_area_mm2("cone", 1000, 40, nozzle_area_mm2)
    assert result["footprint_mm2"] == pytest.approx(expected_footprint)


def test_forward_solve_infeasible_footprint_finite():
    # v_exit=0 when infeasible; nozzle area must fall back to 0, not NaN
    # or a crash.
    inputs = dict(_BASE_2D_INPUTS)
    inputs["standoff_mm"] = 1000
    inputs["spray_angle_deg"] = 40
    inputs["dP_rated_pa"] = 1000.0
    result = calc.forward_solve(inputs)
    assert np.isfinite(result["footprint_mm2"]) and result["footprint_mm2"] >= 0
    assert result["P_local_pa"] == 0.0


# ---------------------------------------------------------------------------
# Cable drum
# ---------------------------------------------------------------------------

def test_drum_one_layer_hand_worked():
    res = calc.drum_solve_radius(100, 0.01, 1, 0.5)
    assert res["turns_per_layer"] == 50
    assert res["r_m"] == pytest.approx(100 / (2 * math.pi * 50) - 0.005, rel=1e-12)
    assert res["feasible"]


def test_drum_three_layers_and_round_trip():
    res = calc.drum_solve_radius(200, 0.008, 3, 0.4)
    assert res["turns_per_layer"] == 50
    assert res["r_m"] == pytest.approx(200 / (2 * math.pi * 50 * 3) - 0.012, rel=1e-12)
    assert calc.drum_capacity(res["r_m"], 0.4, 0.008, 3) == pytest.approx(200, rel=1e-12)
    back = calc.drum_solve_length(200, 0.008, 3, res["r_m"])
    assert back["turns_per_layer"] == 50
    assert back["W_m"] == pytest.approx(0.4, rel=1e-12)


def test_drum_length_is_minimal_and_holds_cable():
    w = calc.drum_solve_length(137, 0.012, 2, 0.15)["W_m"]
    assert calc.drum_capacity(0.15, w, 0.012, 2) >= 137
    assert calc.drum_capacity(0.15, w - 0.012, 0.012, 2) < 137


def test_drum_infeasible():
    bad = calc.drum_forward({"solve": "r", "L_m": 1, "d_m": 0.01, "layers": 5, "W_m": 1})
    assert not bad["feasible"]
    assert not calc.drum_solve_radius(10, 0.01, 1, 0.005)["feasible"]


@pytest.mark.parametrize("L, d, N", [(100, 0.01, 1), (250, 0.008, 3), (0.01, 0.01, 1)])
def test_drum_square_diameter_equals_length(L, d, N):
    sq = calc.drum_forward({"solve": "square", "L_m": L, "d_m": d, "layers": N})
    assert 2 * sq["r_m"] == pytest.approx(sq["W_m"], rel=1e-12)
    assert sq["capacity_m"] >= L
    n = sq["turns_per_layer"]
    assert n == 1 or math.pi * N * d * (n - 1) * (n - 1 + N) < L


def test_drum_forward_capacity_mode():
    f = calc.drum_forward({"solve": "L", "r_m": 0.2, "W_m": 0.3, "d_m": 0.01, "layers": 2})
    assert f["L_m"] == pytest.approx(2 * math.pi * 30 * 2 * 0.21, rel=1e-12)
    assert f["outer_radius_m"] == pytest.approx(0.22)
    assert f["total_turns"] == 60


# ---------------------------------------------------------------------------
# Winch motor
# ---------------------------------------------------------------------------

_WINCH_BASE = {"F_n": 500, "v_ms": 1, "G": 10, "eta": 0.9, "r_eff_m": 0.1}
_WINCH_SINGULAR = {("v_ms", "T_motor_nm"), ("F_n", "rpm_motor"), ("G", "power_w")}


def test_drum_top_radius():
    assert calc.drum_top_radius(0.1, 0.01, 3) == pytest.approx(0.125)


def test_winch_forward_hand_worked():
    f = calc.winch_forward(_WINCH_BASE)
    assert f["T_motor_nm"] == pytest.approx(500 * 0.1 / 9)
    assert f["rpm_motor"] == pytest.approx(10 * 60 / (2 * math.pi * 0.1))
    assert f["power_w"] == pytest.approx(500 / 0.9)


@pytest.mark.parametrize("var", ["F_n", "v_ms", "G"])
@pytest.mark.parametrize("metric", ["T_motor_nm", "rpm_motor", "power_w"])
def test_winch_solve_round_trip(var, metric):
    f = calc.winch_forward(_WINCH_BASE)
    if (var, metric) in _WINCH_SINGULAR:
        with pytest.raises(ValueError):
            calc.winch_solve([var], {metric: f[metric]}, _WINCH_BASE)
    else:
        got = calc.winch_solve([var], {metric: f[metric]}, _WINCH_BASE)
        assert got[var] == pytest.approx(_WINCH_BASE[var], rel=1e-9)


def test_winch_solve_2x2():
    f = calc.winch_forward(_WINCH_BASE)
    two = calc.winch_solve(["G", "v_ms"], {"T_motor_nm": f["T_motor_nm"], "rpm_motor": f["rpm_motor"]}, _WINCH_BASE)
    assert two["G"] == pytest.approx(10, rel=1e-9)
    assert two["v_ms"] == pytest.approx(1, rel=1e-9)


def test_motor_ratings_kv_mode():
    kv = calc.motor_ratings("kv", {"Kv_rpm_v": 100, "V_supply": 48, "I_cont_a": 20, "I_peak_a": 60})
    assert kv["Kt"] == pytest.approx(60 / (2 * math.pi * 100))
    assert kv["T_cont"] == pytest.approx(kv["Kt"] * 20)
    assert kv["rpm_noload"] == pytest.approx(4800)
    given = calc.motor_ratings("kv", {"Kv_rpm_v": 100, "Kt_nm_a": 0.2, "V_supply": 48,
                                      "I_cont_a": 20, "I_peak_a": 60})
    assert given["Kt"] == 0.2


def test_motor_checks_thresholds():
    ds = calc.motor_ratings("datasheet", {"T_cont_nm": 1, "T_peak_nm": 3, "rpm_noload": 3000})
    assert calc.motor_checks(ds, 1.0, 0)["holding_ok"]
    assert not calc.motor_checks(ds, 1.01, 0)["holding_ok"]
    assert calc.motor_checks(ds, 1.5, 0)["rpm_available"] == pytest.approx(1500)
    assert calc.motor_checks(ds, 1.5, 1500)["speed_ok"]
    assert not calc.motor_checks(ds, 1.5, 1501)["speed_ok"]
    assert not calc.motor_checks(ds, 1.5, 0)["past_max_power"]
    assert calc.motor_checks(ds, 1.51, 0)["past_max_power"]
    assert calc.motor_checks(ds, 1, 0)["current_a"] is None
