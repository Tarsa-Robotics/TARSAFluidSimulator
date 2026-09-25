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
    dP_rated_pa: [50_000.0, 700_000_000.0],
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

  function hydraulicPower(QM3s, dPRatedPa) {
    return QM3s * dPRatedPa;
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

  // Stage 7 — local impact pressure at glass, via footprint-area spreading.
  // P_local = F_jet / A_footprint. Two independent mechanisms grow the
  // footprint as the jet travels: (1) the nozzle's designed spray angle
  // (geometric spreading — dominant once the angle exceeds the jet's
  // natural turbulent spread, roughly θ >= 15° at these standoffs), and
  // (2) turbulent free-jet entrainment, which widens the jet even at θ=0
  // ("pencil" mode). The effective footprint area is whichever mechanism
  // predicts the larger area — geometric spreading wins at typical
  // operating standoffs (200mm+) once θ is past its natural-spread angle;
  // the turbulent term only matters as a floor near θ=0.
  //
  // The geometric formulas originate the cone/fan from the nozzle's finite
  // exit size, not a mathematical point: A_footprint = π·(r_nozzle +
  // standoff·tan(θ/2))² for cone, width = b_nozzle + 2·standoff·tan(θ/2)
  // for fan. A point-origin model (r_nozzle = 0) blows up wrong at small
  // standoff — as standoff -> 0 it predicts a footprint smaller than the
  // nozzle's own exit, i.e. f_geometric = A_nozzle/A_footprint > 1, which
  // is physically impossible: the footprint can never shrink below the
  // exit that's producing it, no matter how close you get. r_nozzle (and,
  // for fan, b_nozzle) come from continuity, A_nozzle = Q/v_exit — real
  // geometry, not a tunable.
  //
  // Cone/round pattern: A = π·(r_nozzle + standoff·tan(θ/2))² — at large
  // standoff the r_nozzle term is negligible and area grows as standoff²,
  // so P_local decays as 1/standoff².
  // Flat/fan pattern: width = b_nozzle + 2·standoff·tan(θ/2), area = width
  // × a roughly constant impact-strip length L_strip — at large standoff
  // area grows ~linearly, so P_local decays as 1/standoff. This is the
  // real physical reason a fan nozzle holds pressure over distance better
  // than a cone.
  //
  // Turbulent floor, from classical free-jet decay (Rajaratnam): round
  // jets u_c/u0 = 6.2·D/x, flat jets u_c/u0 = 2.4·√(b/x). Momentum flux
  // (ρ·u²·A) is conserved along a free jet, so the equivalent turbulent
  // footprint area is A0 / (u_c/u0)² — and because A0 = π·D²/4 (round) or
  // A0 = b·L_strip (fan) by definition of the orifice, D and b cancel out
  // of that ratio algebraically, leaving a floor that depends only on
  // standoff (and, for fan, the strip length). This floor formula is a
  // far-field asymptotic approximation, not meant to be evaluated near
  // standoff = 0 — but it doesn't need to be: the corrected geometric term
  // already floors at A_nozzle there, so the max() of the two stays
  // physical at every standoff.
  const K_ROUND_TURB = 6.2;
  const K_FLAT_TURB = 5.76; // = 2.4^2, from u_c/u0 = 2.4·sqrt(b/x)
  const L_STRIP_MM_DEFAULT = 25.0; // fan slot's impact-strip length at exit — assumed, not sourced
  const P_THRESHOLD_PA_DEFAULT = 800_000.0; // 8 bar, Kim et al. proven floor

  // nozzleAreaMm2 = the nozzle exit's real cross-sectional area (from
  // continuity, Q/v_exit) — defaults to 0 (mathematical point origin) only
  // for callers that don't have it, e.g. exploring the pure decay shape.
  function footprintAreaMm2(pattern, standoffMm, sprayAngleDeg, nozzleAreaMm2 = 0, LStripMm = L_STRIP_MM_DEFAULT) {
    const tanHalf = Math.tan((sprayAngleDeg * Math.PI) / 360.0);
    if (pattern === "fan") {
      const bNozzleMm = LStripMm > 0 ? nozzleAreaMm2 / LStripMm : 0;
      const widthFootprint = bNozzleMm + 2.0 * standoffMm * tanHalf;
      const geometric = widthFootprint * LStripMm;
      const turbulentFloor = (standoffMm / K_FLAT_TURB) * LStripMm;
      return Math.max(geometric, turbulentFloor);
    }
    const rNozzleMm = Math.sqrt(nozzleAreaMm2 / Math.PI);
    const rFootprint = rNozzleMm + standoffMm * tanHalf;
    const geometric = Math.PI * rFootprint ** 2;
    const turbulentFloor = (Math.PI * standoffMm ** 2) / (4.0 * K_ROUND_TURB ** 2);
    return Math.max(geometric, turbulentFloor);
  }

  function localImpactPressure(FJetN, footprintMm2) {
    if (footprintMm2 <= 0) return 0.0;
    return FJetN / (footprintMm2 * 1e-6); // N / m^2 = Pa
  }

  // Stage 8 — cleaning verdict.
  function cleaningRatio(pLocalPa, pThresholdPa) {
    return pThresholdPa ? pLocalPa / pThresholdPa : Infinity;
  }

  function cleaningVerdict(r) {
    if (r >= 2.0) return "green";
    if (r >= 1.0) return "yellow";
    return "red";
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
    const standoffMm = inputs.standoff_mm ?? 200.0;
    const sprayAngleDeg = inputs.spray_angle_deg ?? 40.0;
    const nozzlePattern = inputs.nozzle_pattern ?? "cone";
    const LStripMm = inputs.L_strip_mm ?? L_STRIP_MM_DEFAULT;
    const pThresholdPa = inputs.p_threshold_pa ?? P_THRESHOLD_PA_DEFAULT;

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

    const hydraulicPowerW = hydraulicPower(QM3s, dPRatedPa);

    // Nozzle exit area from continuity (Q = A*v), in mm^2 — real geometry,
    // not a tunable. 0 when infeasible (v_exit=0): footprint value doesn't
    // matter there since F_jet=0 makes P_local 0 regardless.
    const nozzleAreaMm2 = vExit > 0 ? ((QM3s / vExit) * 1e6) : 0;
    const footprintMm2 = footprintAreaMm2(nozzlePattern, standoffMm, sprayAngleDeg, nozzleAreaMm2, LStripMm);
    const pLocalPa = localImpactPressure(FJet, footprintMm2);
    const cleaningR = cleaningRatio(pLocalPa, pThresholdPa);
    const cleaningVerdictVal = cleaningVerdict(cleaningR);

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
      hydraulic_power_w: hydraulicPowerW,
      footprint_mm2: footprintMm2,
      P_local_pa: pLocalPa,
      cleaning_R: cleaningR,
      cleaning_verdict: cleaningVerdictVal,
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

  // --- Cable drum sizing -------------------------------------------------
  // N layers of n turns each; the turn in layer k (0-based) sits on
  // centerline radius r + d/2 + k*d, so summing the N layers gives the
  // closed form 2*pi*n*N*(r + N*d/2). The small epsilon keeps float noise
  // (e.g. 0.3/0.01 = 29.999...) from dropping or adding a whole turn.
  const DRUM_EPS = 1e-9;

  function drumTurnsPerLayer(WM, dM) {
    return Math.floor(WM / dM + DRUM_EPS);
  }

  function drumCapacity(rM, WM, dM, layers) {
    const n = drumTurnsPerLayer(WM, dM);
    return 2 * Math.PI * n * layers * (rM + (layers * dM) / 2);
  }

  /** Drum length fixed -> barrel radius that just fits L_m of cable. */
  function drumSolveRadius(LM, dM, layers, WM) {
    const n = drumTurnsPerLayer(WM, dM);
    if (n < 1) return { r_m: NaN, turns_per_layer: n, feasible: false };
    const rM = LM / (2 * Math.PI * n * layers) - (layers * dM) / 2;
    return { r_m: rM, turns_per_layer: n, feasible: rM > 0 };
  }

  /** Barrel radius fixed -> shortest drum (whole turns) that fits L_m. */
  function drumSolveLength(LM, dM, layers, rM) {
    const perTurn = 2 * Math.PI * layers * (rM + (layers * dM) / 2);
    const n = Math.max(1, Math.ceil(LM / perTurn - DRUM_EPS));
    return { W_m: n * dM, turns_per_layer: n };
  }

  /**
   * Drum diameter forced equal to drum length (2r = W = n*d). Capacity is
   * then pi*N*d*n*(n + N), so take the smallest whole n that holds L.
   */
  function drumSolveSquare(LM, dM, layers) {
    const k = LM / (Math.PI * layers * dM);
    const n = Math.max(1, Math.ceil((-layers + Math.sqrt(layers ** 2 + 4 * k)) / 2 - DRUM_EPS));
    return { r_m: (n * dM) / 2, W_m: n * dM, turns_per_layer: n };
  }

  /**
   * Single entry point for the drum tab, mirroring forwardSolve's role.
   * `solve` names the unknown: "r" (W given), "W" (r given), or "L"
   * (r and W given -> cable capacity), or "square" (diameter = length).
   */
  function drumForward(inputs) {
    const { d_m: dM, layers, solve } = inputs;
    let { L_m: LM, r_m: rM, W_m: WM } = inputs;
    let feasible = true;
    if (solve === "r") {
      const res = drumSolveRadius(LM, dM, layers, WM);
      rM = res.r_m;
      feasible = res.feasible;
    } else if (solve === "W") {
      WM = drumSolveLength(LM, dM, layers, rM).W_m;
      feasible = rM > 0;
    } else if (solve === "square") {
      ({ r_m: rM, W_m: WM } = drumSolveSquare(LM, dM, layers));
    } else if (solve === "L") {
      LM = drumCapacity(rM, WM, dM, layers);
      feasible = rM > 0 && drumTurnsPerLayer(WM, dM) >= 1;
    } else {
      throw new Error(`drumForward: unknown solve target ${solve}`);
    }
    const n = drumTurnsPerLayer(WM, dM);
    return {
      L_m: LM,
      r_m: rM,
      W_m: WM,
      outer_radius_m: rM + layers * dM,
      turns_per_layer: n,
      total_turns: n * layers,
      capacity_m: feasible ? drumCapacity(rM, WM, dM, layers) : NaN,
      feasible,
    };
  }

  const TarsaCalc = {
    RHO_WATER,
    G,
    BRACKETS,
    K_ROUND_TURB,
    K_FLAT_TURB,
    L_STRIP_MM_DEFAULT,
    P_THRESHOLD_PA_DEFAULT,
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
    footprintAreaMm2,
    localImpactPressure,
    cleaningRatio,
    cleaningVerdict,
    forwardSolve,
    solveFor,
    solveFor2,
    drumTurnsPerLayer,
    drumCapacity,
    drumSolveRadius,
    drumSolveLength,
    drumSolveSquare,
    drumForward,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = TarsaCalc;
  }
  global.TarsaCalc = TarsaCalc;
})(typeof window !== "undefined" ? window : globalThis);
