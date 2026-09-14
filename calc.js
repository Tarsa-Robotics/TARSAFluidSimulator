/**
 * Pure physics functions for the TARSA hose/pump sizing calculator.
 *
 * 1:1 port of calc.py — same formulas, same structure, same function
 * intent. No DOM/UI dependency; used by calculator.html and validated by
 * test_calc.mjs against the same worked examples calc.py's pytest suite
 * checks. scipy.optimize.brentq has no JS equivalent, so both root-finds
 * use the shared `bisect` helper below instead.
 *
 * Plain classic script (no ES module import/export): `type="module"`
 * scripts can't load over file:// due to browser CORS restrictions, which
 * would silently break this page for anyone opening it by double-click
 * instead of through a server. Exposes everything on `globalThis.TarsaCalc`
 * instead, and also as CommonJS `module.exports` for Node-based testing.
 */
(function (global) {
  const RHO_WATER = 1000.0; // kg/m^3
  const G = 9.81; // m/s^2

  // Dynamic viscosity of water (Pa*s) at standard reference temperatures (CRC).
  const MU_TEMPS_C = [0.0, 10.0, 20.0, 30.0, 40.0];
  const MU_VALUES = [1.787e-3, 1.307e-3, 1.002e-3, 0.7975e-3, 0.6529e-3];

  // Outer-solver brackets for lockable variables, per the brief.
  const BRACKETS = {
    id_m: [0.003, 0.05],
    L_m: [1.0, 200.0],
    H_m: [0.0, 150.0],
    dP_rated_pa: [50_000.0, 3_000_000.0],
    Q_m3s: [1e-5, 1e-2],
  };

  /** Linear interpolation, matching numpy.interp's clamp-at-edges behavior. */
  function interp(x, xs, ys) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    for (let i = 0; i < xs.length - 1; i++) {
      if (x >= xs[i] && x <= xs[i + 1]) {
        const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
        return ys[i] + t * (ys[i + 1] - ys[i]);
      }
    }
    return ys[ys.length - 1];
  }

  function muWater(TCelsius) {
    return interp(TCelsius, MU_TEMPS_C, MU_VALUES);
  }

  function hoseArea(idM) {
    return (Math.PI / 4.0) * idM ** 2;
  }

  function hoseVelocity(QM3s, idM) {
    return QM3s / hoseArea(idM);
  }

  function reynoldsNumber(v, idM, mu, rho) {
    return (rho * v * idM) / mu;
  }

  /**
   * Robust bisection root-finder — replaces scipy.optimize.brentq. The
   * functions solved here (Colebrook-White, forward_solve vs. a target
   * metric) are smooth and monotonic within their brackets, so plain
   * bisection is simple to verify correct; convergence speed doesn't
   * matter for a UI that solves once per interaction.
   */
  function bisect(f, lo, hi, tol = 1e-10, maxIter = 200) {
    let flo = f(lo);
    let fhi = f(hi);
    if (flo === 0) return lo;
    if (fhi === 0) return hi;
    if (flo * fhi > 0) {
      throw new Error(`bisect: f(lo) and f(hi) must have opposite signs (got ${flo}, ${fhi})`);
    }
    let a = lo;
    let b = hi;
    for (let i = 0; i < maxIter; i++) {
      const mid = (a + b) / 2;
      const fmid = f(mid);
      if (Math.abs(fmid) < tol || (b - a) / 2 < tol) return mid;
      if (flo * fmid < 0) {
        b = mid;
      } else {
        a = mid;
        flo = fmid;
      }
    }
    return (a + b) / 2;
  }

  function swameeJainGuess(Re, idM, roughnessM) {
    const relRough = roughnessM / idM;
    const denom = Math.log10(relRough / 3.7 + 5.74 / Re ** 0.9);
    return 0.25 / denom ** 2;
  }

  function frictionFactor(Re, idM, roughnessM) {
    if (Re < 2300) return 64.0 / Re;

    const relRough = roughnessM / idM;
    const colebrook = (f) =>
      1.0 / Math.sqrt(f) + 2.0 * Math.log10(relRough / 3.7 + 2.51 / (Re * Math.sqrt(f)));

    const fGuess = swameeJainGuess(Re, idM, roughnessM);
    let lo = Math.max(1e-8, fGuess / 50.0);
    let hi = Math.min(1.0, fGuess * 50.0);
    if (colebrook(lo) * colebrook(hi) > 0) {
      lo = 1e-8;
      hi = 1.0;
    }
    return bisect(colebrook, lo, hi);
  }

  function frictionLossDP(f, LM, idM, rho, v) {
    return f * (LM / idM) * ((rho * v ** 2) / 2.0);
  }

  function elevationLossDP(HM, rho, g) {
    return rho * g * HM;
  }

  function exitVelocity(dPEffectivePa, rho, Cv) {
    if (dPEffectivePa <= 0) return 0.0;
    return Cv * Math.sqrt((2.0 * dPEffectivePa) / rho);
  }

  function jetReactionForce(rho, QM3s, vExit) {
    return rho * QM3s * vExit;
  }

  function burstMargin(pBurstPa, pRatedPa) {
    return pBurstPa / pRatedPa;
  }

  function hoseMassTotal(weightPerM, lengthM) {
    return weightPerM * lengthM;
  }

  function waterMassTotal(idM, lengthM, rho = RHO_WATER) {
    return rho * hoseArea(idM) * lengthM;
  }

  function velocityBand(vHose) {
    if (vHose < 4.0) return "ideal";
    if (vHose <= 6.0) return "acceptable";
    return "erosion_risk";
  }

  function forwardSolve(inputs) {
    const idM = inputs.id_m;
    const LM = inputs.L_m;
    const HM = inputs.H_m;
    const QM3s = inputs.Q_m3s;
    const dPRatedPa = inputs.dP_rated_pa;
    const Cv = inputs.Cv ?? 1.0;
    const roughnessM = inputs.roughness_m ?? 0.005e-3;
    const TCelsius = inputs.T_celsius ?? 20.0;
    const weightPerM = inputs.weight_per_m ?? 0.0;
    const pBurstPa = inputs.p_burst_pa ?? 0.0;

    const mu = muWater(TCelsius);
    const vHose = hoseVelocity(QM3s, idM);
    const Re = reynoldsNumber(vHose, idM, mu, RHO_WATER);
    const f = frictionFactor(Re, idM, roughnessM);
    const dPFriction = frictionLossDP(f, LM, idM, RHO_WATER, vHose);
    const dPElevation = elevationLossDP(HM, RHO_WATER, G);
    const dPEffective = dPRatedPa - dPFriction - dPElevation;
    const feasible = dPEffective > 0;

    const vExit = exitVelocity(dPEffective, RHO_WATER, Cv);
    const FJet = jetReactionForce(RHO_WATER, QM3s, vExit);

    const vExitStructural = exitVelocity(dPRatedPa * 2.0, RHO_WATER, Cv);
    const FJetStructural = jetReactionForce(RHO_WATER, QM3s, vExitStructural);

    const margin = dPRatedPa ? burstMargin(pBurstPa, dPRatedPa) : Infinity;

    // Mass uses H (suspended length), not L (total flow-path length): the
    // hose hangs straight from a ground-based reel up to the robot, so the
    // portion actually loading the cables is the vertical climb, not the
    // full flow length (any slack beyond H sits coiled at the base).
    const hoseMass = hoseMassTotal(weightPerM, HM);
    const waterMass = waterMassTotal(idM, HM);

    return {
      mu,
      v_hose: vHose,
      Re,
      f,
      dP_friction: dPFriction,
      dP_elevation: dPElevation,
      dP_effective: dPEffective,
      feasible,
      v_exit: vExit,
      F_jet: FJet,
      F_jet_structural: FJetStructural,
      burst_margin: margin,
      burst_pass: margin >= 2.0,
      velocity_band: velocityBand(vHose),
      hose_mass: hoseMass,
      water_mass: waterMass,
      total_suspended_mass: hoseMass + waterMass,
    };
  }

  function solveFor(unknownVar, targetMetric, targetValue, fixedInputs, bracket) {
    const [lo, hi] = bracket ?? BRACKETS[unknownVar];
    const objective = (x) => {
      const inputs = { ...fixedInputs, [unknownVar]: x };
      return forwardSolve(inputs)[targetMetric] - targetValue;
    };
    return bisect(objective, lo, hi);
  }

  /**
   * Solve 2 unknowns against 2 simultaneous targets — a 2x2 nonlinear
   * system. Deliberately NOT a multi-dimensional Newton-Raphson: instead,
   * nested bisection built entirely out of the proven 1D `solveFor`/`bisect`
   * primitives above. One variable (outer) is bisected; for each candidate
   * outer value, the other variable (inner) is solved exactly via the
   * existing 1D solveFor to hit its assigned target; the outer bisection
   * then drives its own target to zero. This keeps bisection's
   * guaranteed-convergence-given-a-bracketing-sign-change property at both
   * levels, rather than introducing a method that can silently diverge.
   *
   * Not every (varA, varB, metricA, metricB) combination is solvable — e.g.
   * burst_margin depends only on dP_rated_pa among the 5 lockable inputs,
   * so targeting it while dP_rated_pa is held fixed is genuinely
   * infeasible, not a solver bug. Which variable plays "outer" vs "inner",
   * and which variable is assigned to which target, both affect whether a
   * given nested-bisection formulation happens to satisfy bisection's
   * sign-change precondition — so all 4 (2 metric-assignments x 2
   * outer/inner role choices) are tried before giving up.
   */
  function solveFor2(varA, varB, metricA, targetA, metricB, targetB, fixedInputs) {
    function attempt(outerVar, outerMetric, outerTarget, innerVar, innerMetric, innerTarget) {
      const [outerLo, outerHi] = BRACKETS[outerVar];
      function g(outerValue) {
        const outerFixed = { ...fixedInputs, [outerVar]: outerValue };
        const innerValue = solveFor(innerVar, innerMetric, innerTarget, outerFixed);
        const finalInputs = { ...outerFixed, [innerVar]: innerValue };
        return forwardSolve(finalInputs)[outerMetric] - outerTarget;
      }
      const outerValue = bisect(g, outerLo, outerHi);
      const outerFixed = { ...fixedInputs, [outerVar]: outerValue };
      const innerValue = solveFor(innerVar, innerMetric, innerTarget, outerFixed);
      return { [outerVar]: outerValue, [innerVar]: innerValue };
    }

    const attempts = [
      () => attempt(varA, metricA, targetA, varB, metricB, targetB),
      () => attempt(varA, metricB, targetB, varB, metricA, targetA),
      () => attempt(varB, metricA, targetA, varA, metricB, targetB),
      () => attempt(varB, metricB, targetB, varA, metricA, targetA),
    ];

    let lastError = null;
    for (const tryAttempt of attempts) {
      try {
        return tryAttempt();
      } catch (e) {
        lastError = e;
      }
    }
    throw new Error(
      `solveFor2: no solution for {${metricA}=${targetA}, ${metricB}=${targetB}} ` +
        `varying {${varA}, ${varB}}. This combination may not be solvable ` +
        `(e.g. a target that doesn't depend on either unlocked input). ` +
        `Last attempt: ${lastError ? lastError.message : "unknown"}`
    );
  }

  const TarsaCalc = {
    RHO_WATER,
    G,
    BRACKETS,
    muWater,
    hoseArea,
    hoseVelocity,
    reynoldsNumber,
    bisect,
    frictionFactor,
    frictionLossDP,
    elevationLossDP,
    exitVelocity,
    jetReactionForce,
    burstMargin,
    hoseMassTotal,
    waterMassTotal,
    velocityBand,
    forwardSolve,
    solveFor,
    solveFor2,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = TarsaCalc;
  }
  global.TarsaCalc = TarsaCalc;
})(typeof window !== "undefined" ? window : globalThis);
