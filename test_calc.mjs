/**
 * Acceptance-gate test suite for calc.js — must pass before calculator.html
 * is trusted. Port of test_calc.py's exact assertions/tolerances, run via
 * `node test_calc.mjs`. Same cases: the Comet P40 worked example, the Kim
 * et al. independent cross-check, the three hose-ID velocity-band cases,
 * the laminar branch, and a Colebrook turbulent sanity case verified
 * against the Haaland explicit approximation (not a hardcoded chart value).
 */

import calc from "./calc.js";

const RHO = calc.RHO_WATER;
const PSI_TO_PA = 6894.757293168361;
const Q_P40 = 7.2554e-4; // m^3/s, 11.5 GPM

let passed = 0;
let failed = 0;

function approx(actual, expected, rel = 1e-6, label = "") {
  const tol = Math.abs(expected) * rel;
  const ok = Math.abs(actual - expected) <= tol || (expected === 0 && actual === 0);
  if (ok) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL ${label}: got ${actual}, expected ${expected} (rel=${rel})`);
  }
}

function check(condition, label) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL ${label}`);
  }
}

// --- P40 worked example, 300 psi electric-start ---
{
  const dPRated = 2_068_427.0;
  const vExit = calc.exitVelocity(dPRated, RHO, 1.0);
  const FJet = calc.jetReactionForce(RHO, Q_P40, vExit);
  approx(vExit, 64.3, 0.01, "p40_300psi.v_exit");
  approx(FJet, 46.7, 0.01, "p40_300psi.F_jet");
}

// --- P40 worked example, 290 psi pull-start ---
{
  const dPRated = 290 * PSI_TO_PA;
  const vExit = calc.exitVelocity(dPRated, RHO, 1.0);
  const FJet = calc.jetReactionForce(RHO, Q_P40, vExit);
  approx(vExit, 63.2, 0.01, "p40_290psi.v_exit");
  approx(FJet, 45.9, 0.01, "p40_290psi.F_jet");
}

// --- Kim et al. cross-check ---
{
  const vExit = calc.exitVelocity(800_000.0, RHO, 1.0);
  approx(vExit, 40.0, 0.01, "kim_et_al.v_exit");
}

// --- Hose velocity bands ---
{
  const cases = [
    [9.5, 10.2, "erosion_risk"],
    [12.7, 5.7, "acceptable"],
    [15.9, 3.7, "ideal"],
  ];
  for (const [idMm, expectedV, expectedBand] of cases) {
    const v = calc.hoseVelocity(Q_P40, idMm / 1000.0);
    approx(v, expectedV, 0.015, `velocity_band[${idMm}mm].v`);
    check(calc.velocityBand(v) === expectedBand, `velocity_band[${idMm}mm].band`);
  }
}

// --- Friction factor: laminar ---
{
  const Re = 1500.0;
  const f = calc.frictionFactor(Re, 0.02, 0.005e-3);
  approx(f, 64.0 / Re, 1e-9, "friction_factor.laminar");
}

// --- Friction factor: turbulent Colebrook vs. Haaland cross-check ---
function haalandF(Re, relRough) {
  const invSqrtF = -1.8 * Math.log10((relRough / 3.7) ** 1.11 + 6.9 / Re);
  return 1.0 / invSqrtF ** 2;
}
{
  const Re = 1e5;
  const relRough = 0.001;
  const idM = 0.05;
  const roughnessM = relRough * idM;
  const f = calc.frictionFactor(Re, idM, roughnessM);
  const fHaaland = haalandF(Re, relRough);
  approx(f, fHaaland, 0.02, "friction_factor.turbulent_vs_haaland");
  check(f > 0.02 && f < 0.024, "friction_factor.turbulent_sanity_range");
}

// --- Friction factor: solved value actually satisfies Colebrook exactly ---
{
  const Re = 5e4;
  const idM = 0.03;
  const roughnessM = 0.0002;
  const f = calc.frictionFactor(Re, idM, roughnessM);
  const relRough = roughnessM / idM;
  const lhs = 1.0 / Math.sqrt(f);
  const rhs = -2.0 * Math.log10(relRough / 3.7 + 2.51 / (Re * Math.sqrt(f)));
  approx(lhs, rhs, 1e-6, "friction_factor.colebrook_self_consistent");
}

// --- forward_solve: infeasible flag ---
{
  const result = calc.forwardSolve({
    id_m: 0.0095,
    L_m: 100.0,
    H_m: 100.0,
    Q_m3s: Q_P40,
    dP_rated_pa: 50_000.0,
    Cv: 1.0,
    roughness_m: 0.005e-3,
    T_celsius: 20.0,
  });
  check(result.feasible === false, "forward_solve.infeasible_flag");
  check(result.v_exit === 0.0, "forward_solve.infeasible_v_exit_zero");
}

// --- Water mass ---
{
  const idM = 0.0159;
  const LM = 30.0;
  const expected = RHO * (Math.PI / 4.0) * idM ** 2 * LM;
  approx(calc.waterMassTotal(idM, LM), expected, 1e-9, "water_mass_total");
}

// Mass is driven by H (suspended length: the hose hangs straight from a
// ground-based reel up to the robot, so only the vertical climb loads the
// cables), not L (the water's full flow-path length, which can exceed H
// due to slack coiled at the base and is unrelated to what's actually
// hanging).
{
  const inputs = {
    id_m: 0.0159,
    L_m: 50.0, // deliberately different from H_m, to prove mass ignores it
    H_m: 20.0,
    Q_m3s: Q_P40,
    dP_rated_pa: 2_068_427.0,
    Cv: 1.0,
    roughness_m: 0.005e-3,
    T_celsius: 20.0,
    weight_per_m: 0.22,
  };
  const result = calc.forwardSolve(inputs);
  approx(result.hose_mass, 0.22 * 20.0, 1e-9, "total_suspended.hose_mass");
  approx(result.water_mass, calc.waterMassTotal(0.0159, 20.0), 1e-9, "total_suspended.water_mass");
  approx(
    result.total_suspended_mass,
    result.hose_mass + result.water_mass,
    1e-9,
    "total_suspended.sum"
  );
  check(
    Math.abs(result.hose_mass - result.total_suspended_mass) > 1e-6,
    "total_suspended.hose_mass_excludes_water"
  );

  const resultLongerL = calc.forwardSolve({ ...inputs, L_m: 150.0 });
  approx(resultLongerL.hose_mass, result.hose_mass, 1e-9, "total_suspended.mass_ignores_L");
  approx(resultLongerL.water_mass, result.water_mass, 1e-9, "total_suspended.water_ignores_L");
}

// --- solveFor: round-trip sanity (not in test_calc.py, but exercises the
// outer bisection root-finder that replaces scipy.optimize.brentq) ---
{
  const fixedInputs = {
    L_m: 30.0,
    H_m: 20.0,
    Q_m3s: Q_P40,
    dP_rated_pa: 300 * PSI_TO_PA,
    Cv: 1.0,
    roughness_m: 0.005e-3,
    T_celsius: 20.0,
  };
  const solvedIdM = calc.solveFor("id_m", "v_hose", 4.0, fixedInputs);
  const vCheck = calc.hoseVelocity(Q_P40, solvedIdM);
  approx(vCheck, 4.0, 1e-6, "solve_for.v_hose_round_trip");
}

// ---------------------------------------------------------------------
// solveFor2 — locking 2 simultaneous targets (nested bisection)
// ---------------------------------------------------------------------

const BASE_2D_INPUTS = {
  id_m: 0.0159,
  L_m: 30.0,
  H_m: 20.0,
  Q_m3s: Q_P40,
  dP_rated_pa: 300 * PSI_TO_PA,
  Cv: 1.0,
  roughness_m: 0.005e-3,
  T_celsius: 20.0,
  weight_per_m: 0.22,
  p_burst_pa: 4000 * PSI_TO_PA,
};

// A solution is known to exist by construction: forward_solve the base
// inputs, then feed its own v_hose/F_jet back in as 2 targets while
// varying the same 2 inputs that produced them — must recover them.
{
  const baseline = calc.forwardSolve(BASE_2D_INPUTS);
  const result = calc.solveFor2(
    "id_m", "L_m", "v_hose", baseline.v_hose, "F_jet", baseline.F_jet,
    BASE_2D_INPUTS
  );
  approx(result.id_m, 0.0159, 1e-4, "solveFor2.round_trip.id_m");
  approx(result.L_m, 30.0, 1e-4, "solveFor2.round_trip.L_m");
}

// burst_margin depends only on dP_rated_pa among the 5 lockable inputs.
// Solving it alongside v_hose by varying {dP_rated_pa, Q_m3s} must
// succeed. Achievable burst_margin range given p_burst_pa fixed at 4000 psi
// and dP_rated_pa's (effectively uncapped) bracket easily spans 13.33 (the
// P40-300psi default case).
{
  const result = calc.solveFor2(
    "dP_rated_pa", "Q_m3s", "burst_margin", 13.33, "v_hose", 4.0,
    BASE_2D_INPUTS
  );
  const checkInputs = { ...BASE_2D_INPUTS, dP_rated_pa: result.dP_rated_pa, Q_m3s: result.Q_m3s };
  const checkResult = calc.forwardSolve(checkInputs);
  approx(checkResult.burst_margin, 13.33, 1e-3, "solveFor2.burst_margin.burst_margin");
  approx(checkResult.v_hose, 4.0, 1e-4, "solveFor2.burst_margin.v_hose");
}

// L_m and H_m affect neither burst_margin nor v_hose — every one of the 4
// nested-bisection attempts must fail, and the failure must be a clear
// error, not a wrong answer or a hang.
{
  let threw = false;
  try {
    calc.solveFor2("L_m", "H_m", "burst_margin", 13.33, "v_hose", 4.0, BASE_2D_INPUTS);
  } catch (e) {
    threw = true;
  }
  check(threw, "solveFor2.infeasible_combination_throws");
}

// --- Stage 7: footprint area — geometric spreading, cone vs. fan ---
{
  // Geometric formula sanity, both patterns, point-origin (nozzleAreaMm2=0
  // default) — isolates the pure angle/standoff decay shape.
  const s = 1000, theta = 40;
  const tanHalf = Math.tan((theta * Math.PI) / 360);
  approx(calc.footprintAreaMm2("cone", s, theta), Math.PI * (s * tanHalf) ** 2, 1e-6, "footprint.cone_geometric_formula");
  approx(calc.footprintAreaMm2("fan", s, theta, 0, 25), 2 * s * tanHalf * 25, 1e-6, "footprint.fan_geometric_formula");

  // At theta=0 the geometric term vanishes; the turbulent floor must take
  // over rather than returning a zero-area (infinite-pressure) footprint.
  check(calc.footprintAreaMm2("cone", 1000, 0) > 0, "footprint.cone_turbulent_floor_nonzero_at_theta_0");
  check(calc.footprintAreaMm2("fan", 1000, 0, 0, 25) > 0, "footprint.fan_turbulent_floor_nonzero_at_theta_0");
  approx(
    calc.footprintAreaMm2("cone", 1000, 0),
    (Math.PI * 1000 ** 2) / (4 * calc.K_ROUND_TURB ** 2),
    1e-6,
    "footprint.cone_turbulent_floor_formula"
  );
  approx(
    calc.footprintAreaMm2("fan", 1000, 0, 0, 25),
    (1000 / calc.K_FLAT_TURB) * 25,
    1e-6,
    "footprint.fan_turbulent_floor_formula"
  );

  // The physics claim under test: at a spray angle wide enough that
  // geometric spreading dominates (60°), a 10x standoff increase grows the
  // cone footprint ~100x (area ~ standoff^2) but the fan footprint only
  // ~10x (area ~ standoff^1) — the real reason a fan nozzle holds pressure
  // over distance better than a cone.
  const coneNear = calc.footprintAreaMm2("cone", 200, 60);
  const coneFar = calc.footprintAreaMm2("cone", 2000, 60);
  approx(coneFar / coneNear, 100.0, 0.01, "footprint.cone_area_scales_as_standoff_squared");

  const fanNear = calc.footprintAreaMm2("fan", 200, 60, 0, 25);
  const fanFar = calc.footprintAreaMm2("fan", 2000, 60, 0, 25);
  approx(fanFar / fanNear, 10.0, 0.01, "footprint.fan_area_scales_linearly_with_standoff");
}

// --- Stage 7: finite nozzle exit size (point-origin was the actual bug) ---
{
  // Point-origin cone/fan models predict a footprint that shrinks below the
  // nozzle's own exit area as standoff -> 0 — physically impossible, since
  // f_geometric = A_nozzle/A_footprint would exceed 1. The fix originates
  // both patterns from the real (finite) exit size instead of a point.
  const nozzleAreaMm2 = 50.0; // e.g. an ~8mm-diameter round orifice

  // At standoff=0 the footprint must equal the nozzle's own exit area
  // exactly — not smaller, not a point.
  approx(calc.footprintAreaMm2("cone", 0, 40, nozzleAreaMm2), nozzleAreaMm2, 1e-6, "footprint.cone_floors_at_nozzle_area_at_zero_standoff");
  approx(calc.footprintAreaMm2("fan", 0, 40, nozzleAreaMm2, 25), nozzleAreaMm2, 1e-6, "footprint.fan_floors_at_nozzle_area_at_zero_standoff");

  // The physical bound itself: footprint area can never be smaller than the
  // nozzle exit that's producing it, at any standoff, for either pattern.
  for (const s of [0, 5, 50, 200, 2000]) {
    check(calc.footprintAreaMm2("cone", s, 40, nozzleAreaMm2) >= nozzleAreaMm2 - 1e-9, `footprint.cone_never_below_nozzle_area_at_s${s}`);
    check(calc.footprintAreaMm2("fan", s, 40, nozzleAreaMm2, 25) >= nozzleAreaMm2 - 1e-9, `footprint.fan_never_below_nozzle_area_at_s${s}`);
  }

  // At large standoff the nozzle-size offset becomes negligible, converging
  // back to the point-origin formula.
  const withNozzle = calc.footprintAreaMm2("cone", 2000, 40, nozzleAreaMm2);
  const pointOrigin = calc.footprintAreaMm2("cone", 2000, 40);
  approx(withNozzle, pointOrigin, 0.02, "footprint.cone_converges_to_point_origin_at_large_standoff");
}

// --- Stage 7: local impact pressure (P_local = F_jet / A_footprint) ---
{
  approx(calc.localImpactPressure(1000.0, 1_000_000.0), 1000.0, 1e-9, "local_impact_pressure.one_newton_per_m2");
  approx(calc.localImpactPressure(2000.0, 1_000_000.0), 2000.0, 1e-9, "local_impact_pressure.scales_with_force");
  check(calc.localImpactPressure(500.0, 0) === 0.0, "local_impact_pressure.zero_footprint_guarded");
}

// --- Stage 8: cleaning verdict thresholds ---
{
  check(calc.cleaningVerdict(2.0) === "green", "cleaning_verdict.at_2_is_green");
  check(calc.cleaningVerdict(5.0) === "green", "cleaning_verdict.above_2_is_green");
  check(calc.cleaningVerdict(1.0) === "yellow", "cleaning_verdict.at_1_is_yellow");
  check(calc.cleaningVerdict(1.99) === "yellow", "cleaning_verdict.just_under_2_is_yellow");
  check(calc.cleaningVerdict(0.99) === "red", "cleaning_verdict.just_under_1_is_red");
  check(calc.cleaningVerdict(0.0) === "red", "cleaning_verdict.zero_is_red");
}

// --- Stage 7+8 wired into forward_solve ---
{
  const inputs = {
    ...BASE_2D_INPUTS,
    standoff_mm: 1000,
    spray_angle_deg: 40,
    nozzle_pattern: "cone",
    p_threshold_pa: 800_000.0,
  };
  const result = calc.forwardSolve(inputs);
  // forwardSolve derives the nozzle's real exit area from continuity
  // (Q/v_exit) and feeds it in — recompute the same way to check the wiring.
  const nozzleAreaMm2 = (inputs.Q_m3s / result.v_exit) * 1e6;
  const expectedFootprint = calc.footprintAreaMm2("cone", 1000, 40, nozzleAreaMm2);
  approx(result.footprint_mm2, expectedFootprint, 1e-6, "forward_solve.footprint_mm2");
  approx(result.P_local_pa, result.F_jet / (expectedFootprint * 1e-6), 1e-6, "forward_solve.P_local_pa");
  approx(result.cleaning_R, result.P_local_pa / 800_000.0, 1e-9, "forward_solve.cleaning_R");
  check(result.cleaning_verdict === calc.cleaningVerdict(result.cleaning_R), "forward_solve.cleaning_verdict_matches_ratio");
  check(result.footprint_mm2 >= nozzleAreaMm2 - 1e-6, "forward_solve.footprint_never_below_nozzle_area");

  // nozzle_pattern defaults to "cone" when omitted.
  const defaultResult = calc.forwardSolve({ ...inputs, nozzle_pattern: undefined });
  approx(defaultResult.footprint_mm2, expectedFootprint, 1e-6, "forward_solve.nozzle_pattern_defaults_to_cone");

  // Infeasible case (v_exit=0): nozzle area treated as 0, no crash/NaN.
  const infeasible = calc.forwardSolve({ ...inputs, dP_rated_pa: 1000.0 });
  check(Number.isFinite(infeasible.footprint_mm2) && infeasible.footprint_mm2 >= 0, "forward_solve.infeasible_footprint_finite");
  check(infeasible.P_local_pa === 0.0, "forward_solve.infeasible_P_local_zero");
}

// --- Cable drum ---
{
  // 1 layer, hand-worked: n = 0.5/0.01 = 50, r = 100/(2*pi*50) - 0.005
  const r1 = calc.drumSolveRadius(100, 0.01, 1, 0.5);
  check(r1.turns_per_layer === 50, "drum.one_layer_turns");
  approx(r1.r_m, 100 / (2 * Math.PI * 50) - 0.005, 1e-12, "drum.one_layer_radius");
  check(r1.feasible, "drum.one_layer_feasible");

  // 3 layers: r = L/(2*pi*n*N) - N*d/2
  const r3 = calc.drumSolveRadius(200, 0.008, 3, 0.4);
  check(r3.turns_per_layer === 50, "drum.three_layer_turns");
  approx(r3.r_m, 200 / (2 * Math.PI * 50 * 3) - 0.012, 1e-12, "drum.three_layer_radius");
  approx(calc.drumCapacity(r3.r_m, 0.4, 0.008, 3), 200, 1e-12, "drum.capacity_matches_L_exactly");

  // Round trip: the radius solved from W gives back the same turn count.
  const w = calc.drumSolveLength(200, 0.008, 3, r3.r_m);
  check(w.turns_per_layer === 50, "drum.round_trip_turns");
  approx(w.W_m, 0.4, 1e-12, "drum.round_trip_length");

  // Rounded-up length always holds at least L.
  const w2 = calc.drumSolveLength(137, 0.012, 2, 0.15);
  check(calc.drumCapacity(0.15, w2.W_m, 0.012, 2) >= 137, "drum.capacity_at_least_L");
  check(calc.drumCapacity(0.15, w2.W_m - 0.012, 0.012, 2) < 137, "drum.length_is_minimal");

  // Drum too long for the cable -> barrel radius <= 0 -> infeasible.
  const bad = calc.drumForward({ solve: "r", L_m: 1, d_m: 0.01, layers: 5, W_m: 1 });
  check(!bad.feasible, "drum.infeasible_when_radius_nonpositive");
  check(!calc.drumSolveRadius(10, 0.01, 1, 0.005).feasible, "drum.infeasible_when_no_whole_turn");

  // forward: L mode returns capacity, outer radius adds N*d.
  const f = calc.drumForward({ solve: "L", r_m: 0.2, W_m: 0.3, d_m: 0.01, layers: 2 });
  approx(f.L_m, 2 * Math.PI * 30 * 2 * (0.2 + 0.01), 1e-12, "drum.forward_L");
  approx(f.outer_radius_m, 0.22, 1e-12, "drum.forward_outer_radius");
  check(f.total_turns === 60, "drum.forward_total_turns");

  // Square drum (D = W): diameter equals length, capacity holds L, and one
  // fewer turn would not.
  for (const [L, d, N] of [[100, 0.01, 1], [250, 0.008, 3], [0.01, 0.01, 1]]) {
    const sq = calc.drumForward({ solve: "square", L_m: L, d_m: d, layers: N });
    approx(2 * sq.r_m, sq.W_m, 1e-12, `drum.square_D_equals_W(${L})`);
    check(sq.capacity_m >= L, `drum.square_holds_L(${L})`);
    const n = sq.turns_per_layer;
    check(n === 1 || Math.PI * N * d * (n - 1) * (n - 1 + N) < L, `drum.square_minimal(${L})`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
