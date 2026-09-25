# Winch sizing: cable drum and motor

Design notes for the **Cable drum** tab of `index.html`. The math lives in `calc.js` and is mirrored in `calc.py`, with tests in `test_calc.mjs` / `test_calc.py`.

## Purpose and scope

- **What it's for:** sizing one winch of a **large-scale, planar, horizontal cable-driven parallel robot (CDPR)**, meaning its drum, gearbox/pulley ratio and motor.
- **Where the tension comes from:** a separate CDPR simulation gives the **max cable tension** needed to cover the target share of the workspace. This calculator takes that number as an input and does not model the robot.
- **Standalone:** the drum tab is deliberately **not connected** to the Hose & pump tab.
- **The goal:** find a drum + transmission + motor combination that holds and moves the cable at max tension and max speed, and ideally the cheapest one that does. Prices and presets aren't in the tool yet (see [Future work](#future-work)).

## What a horizontal planar CDPR changes

- **No gravity along the cables.** Tension comes from the external wrench plus the antagonistic **pretension** that keeps every cable taut.
- **Tension never drops to zero.** Even with the robot stationary, every winch is holding its pretension. Holding is therefore a steady-state load case, not an edge case.
- **Winches pay out under tension.** When a cable lengthens, the load drives the motor, which acts as a generator. The driver or power supply must be able to absorb that regenerated energy.
- **Layering hurts accuracy.** Cable length is normally estimated from motor angle × drum radius. Each extra layer changes the radius, so multi-layer drums add kinematic error. CDPRs usually use a **single-layer, helically grooved drum**. The tab supports N layers but defaults to 1.

## Drive chain

```
cable (F, v) → drum (r_eff) → gearbox / pulley (G, η) → motor (T, RPM)
```

| Link | Relationship |
|---|---|
| Cable to drum | drum torque = F · r_eff; drum speed ω_drum = v / r_eff |
| Transmission | ω_motor = G · ω_drum; T_motor = T_drum / (G · η) |
| Power | P = F · v = T · ω, less transmission losses |

- **Why speed matters:** without a speed requirement, a bigger G always looks better, because motor torque keeps shrinking as 1/G. What stops G from growing is motor RPM, which rises with G and must stay under what the motor can deliver at that torque. **Line speed is the only thing that caps the gear ratio.** The best G sits where the torque limit and the speed limit meet.

## Drum model

Symbols: L = cable length, d = cable diameter, N = layers, r = barrel radius, W = drum length between flanges, n = turns per layer.

- **Turns per layer:** n = floor(W / d). Only whole turns count.
- **Turn position:** the turn in layer k (k = 0…N−1) sits on centerline radius r + d/2 + k·d.
- **Capacity:** C = 2π · n · N · (r + N·d/2).
- **Length locked, solve radius:** r = L / (2π·n·N) − N·d/2. This is infeasible if r ≤ 0.
- **Radius locked, solve length:** n = ceil(L / (2π·N·(r + N·d/2))), W = n·d.
- **Both locked, solve cable length:** L = C, the cable the drum holds.
- **Zoltan's checkbox (diameter = length):** sets 2r = W = n·d, so C = π·N·d·n·(n + N). Take the smallest whole n with C ≥ L.
- **Outer radius of wound cable:** r + N·d. This is where the top layer ends. A real flange needs clearance above it, and that clearance isn't modelled.
- **Winch radius (worst case):** r_eff = r + d/2 + (N−1)·d, the centerline of the **top** layer. It is the largest lever arm, so it gives the most torque, and the fastest line speed per RPM.

Stacking assumption: each layer sits directly on the one below and adds a full d. If cable nests into the grooves of the layer below, later layers add closer to ≈ 0.87·d. Real winding also has crossover bumps and cable flattening under tension.

## Winch equations

Inputs: F (max tension, N), v (max line speed, m/s), G (gear/pulley ratio), η (transmission efficiency).

- **Motor torque:** T = F · r_eff / (G · η)
- **Motor speed:** RPM = G · v · 60 / (2π · r_eff)
- **Mechanical power:** P = F · v / η

Torque is taken **hauling in**, where η works against the motor. Paying out under tension gives T = F·r_eff·η / G, and the motor regenerates.

### Solving (locks)

The winch section uses the same lock UI as the hose tab: unlock 1–2 of {F, v, G}, then lock the same number of outputs from {T, RPM, P} as targets.

- **Log-linear solve:** every output is a product of powers of F, v and G. Exponents over [F, v, G] are T → [1, 0, −1], RPM → [0, 1, 1], P → [1, 1, 0]. In log space each target becomes a linear equation, so a 1×1 or 2×2 system is solved **exactly**, with no root-finder.
- **Pairs with no unique solution:** if the system is singular, the page says so. This happens when you target:
  - power with only G unlocked,
  - torque with only v unlocked,
  - speed with only F unlocked.

## Motor theory

### Torque–speed line

For a DC or BLDC motor at a fixed supply voltage, torque falls roughly linearly with speed, from **stall torque** at 0 RPM to zero at **no-load speed**:

```
T(ω) ≈ T_stall · (1 − ω / ω_noload)
```

The motor can operate anywhere under that line. Three points along it matter:

| Point | Where | Meaning |
|---|---|---|
| **Max power** | ½ T_stall, ½ ω_noload | The most mechanical work out. This is the "middle of the curve", but the motor runs hot and inefficiently here. |
| **Max efficiency** | Close to no-load, typically ~10–20% of stall torque | The least heat per watt delivered. |
| **Continuous (rated)** | Set by heat, not by the line | Copper loss ∝ I² ∝ T². Only torque at or below the continuous rating can be held indefinitely. That is usually well below the max-power point. |

**Design rule:** choose G so that the **continuous load sits at or below the continuous torque rating**, with peaks staying under peak torque.

### Holding with current (the chosen strategy)

The motor holds cable tension by drawing current. A CDPR winch almost always carries tension, so this sets the size of the motor:

- **The key check:** continuous torque **at 0 RPM** ≥ F · r_eff / (G · η).
- **Why 0 RPM is the hardest case for a BLDC:** at standstill the current doesn't rotate through the phases, so one or two windings take all the heat. Some datasheets give a separate stall-continuous torque, lower than the rated continuous torque. **Use it if it exists.**
- **Cost:** holding draws power the whole time the robot is under tension, even when it isn't moving.

### Holding strategies compared

| Strategy | Motor sizing | Trade-offs |
|---|---|---|
| **Motor holds with current** (current choice) | Continuous torque at 0 RPM must cover the holding torque. | Simplest mechanically and fully back-drivable, so it's good for force control. Needs the biggest motor and constant power. |
| Spring-applied brake on the motor shaft | Motor sized only for the moving case. The brake needs ≥ F·r_eff/G × safety factor, which is small because the brake is before the gearbox. | Extra part, but fail-safe: the robot doesn't drift on power loss. Often the cheapest overall. |
| Self-locking worm gear | No brake needed. | η is often below 0.5, so the motor must be bigger when moving. Not back-drivable, which is bad for CDPR force control. |

### Kv, Kt and supply voltage

- **Kv (RPM/V):** no-load speed per volt, so no-load RPM ≈ Kv · V_supply.
- **Kt (N·m/A):** torque per amp, so I = T / Kt.
- **Relation between them (ideal motor, SI units):** Kt = 60 / (2π · Kv) ≈ 9.549 / Kv. If Kt is left blank, the page derives it from Kv.
- **Ratings from current limits:** T_cont = Kt · I_cont and T_peak = Kt · I_peak. The motor or the driver limit can be the binding one; use the lower.

## Checks on the page

| Check | Pass condition | Notes |
|---|---|---|
| Holding at 0 RPM | T ≤ T_cont | The main sizing check. |
| Speed at load | RPM ≤ RPM₀ · (1 − T / T_peak) | Peak torque stands in for stall torque. True stall is usually higher, so available speed is **underestimated (conservative)**. |
| Operating point | T / T_peak ≤ 0.5 | Yellow past the max-power point, red past peak. |
| Current (Kv/Kt mode only) | T / Kt ≤ I_cont | Same limit as holding, shown in amps for sizing the driver and supply. |

## Assumptions and limits

- **Tension:** F is the max tension from the external simulation. Its inertial effects are assumed to be included there.
- **Excluded:** rotor inertia, drum inertia and acceleration torque.
- **Efficiency:** η is constant, with no speed or load dependence, and hauling in is taken as the worst case.
- **Motor model:** a linear torque–speed line; peak torque is used as the stall torque; no thermal time constants.
- **Drum:** square stacking with a full d per layer; no flange clearance; no fleet angle.
- **Placeholders:** the default values on the page are placeholders, not a recommended design.

## Future work

- **Holding modes:** brake and self-locking worm as selectable options, sizing the brake torque and switching which torque case is checked against the continuous rating.
- **Inertia and acceleration:** rotor and drum inertia reflected through G² (J_load / G² at the motor), for peak-torque checks during acceleration.
- **Presets and cost:** motor, gearbox and drum presets with price. Add a comparison table or a sweep over G and candidate parts to find the **cheapest config that passes every check**.
- **Regeneration:** power returned while paying out under tension (F·v·η), for sizing the braking resistor or supply.
- **Cable checks:**
  - breaking strength ÷ max tension (safety factor);
  - drum-to-cable diameter ratio D/d against the rope datasheet minimum, because small drums fatigue steel rope.
- **Drum geometry:**
  - flange clearance input and flange radius;
  - groove pitch;
  - fleet angle limits;
  - nested (≈ 0.87·d) layer stacking option.
- **Thermal:** stall-continuous derating and a simple duty-cycle/RMS-torque model instead of the worst-case continuous hold.
- **Kinematic accuracy:** cable-length error from radius change across layers, and a warning when N > 1.
- **Efficiency map:** efficiency as a function of torque and speed, to show where the operating point sits relative to the max-efficiency point.
