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

{
  const inputs = {
    id_m: 0.0159,
    L_m: 30.0,
    H_m: 0.0,
    Q_m3s: Q_P40,
    dP_rated_pa: 2_068_427.0,
    Cv: 1.0,
    roughness_m: 0.005e-3,
    T_celsius: 20.0,
    weight_per_m: 0.22,
  };
  const result = calc.forwardSolve(inputs);
  approx(result.hose_mass, 0.22 * 30.0, 1e-9, "total_suspended.hose_mass");
  approx(result.water_mass, calc.waterMassTotal(0.0159, 30.0), 1e-9, "total_suspended.water_mass");
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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
