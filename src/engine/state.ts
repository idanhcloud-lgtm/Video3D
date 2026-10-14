import {
  at,
  CAM_PEAK,
  camAngle,
  clamp01,
  crankAngle,
  endOf,
  G,
  lobeLift,
  ramp,
  smooth,
  stroke,
  window,
} from './timeline';

// Everything the 3D scene and the overlay need at time t (seconds), as plain numbers.
export type GasState = {fresh: number; burnt: number; glow: number};

export function engineState(t: number) {
  const theta = crankAngle(t);
  const s = stroke(theta - 1e-4);

  // ---- bucket → cylinder ----
  const flip = smooth((t - at('flip')) / (endOf('flip') - at('flip') + 0.2));
  const cut = ramp(t, endOf('flip') - 0.2, 0.8); // cutaway opens after the flip

  // lid: sits on the upright bucket, blown off, comes back as the piston crown
  const blastT = at('blast') + 0.35;
  const lidGone = t >= blastT && t < at('rod');
  const lidFly = lidGone ? (t - blastT) : 0;
  const lidBack = ramp(t, at('rod'), 0.8); // slides up into the cylinder
  const pistonMorph = ramp(t, at('piston'), 0.9); // flat lid → piston with rings

  // ---- parts appearing (0 → 1) ----
  const show = {
    rod: ramp(t, at('rod') + 0.3, 0.8),
    crank: ramp(t, at('crank'), 0.8),
    hole: ramp(t, at('hole') + 0.4, 0.5),
    flywheel: ramp(t, at('flywheel') + 0.2, 1.0),
    injector: ramp(t, at('injector') + 0.2, 0.9),
    plug: ramp(t, at('plug'), 0.9),
    intake: ramp(t, at('intake') + 0.2, 0.9),
    exhaust: ramp(t, at('exhaust') + 0.2, 0.9),
    cams: ramp(t, at('cams') + 0.3, 1.4),
    springs: ramp(t, at('springs') + 0.3, 0.9),
  };

  // ---- firecrackers ----
  // 1: dropped into the upright bucket; 2: dropped through the hole in the head
  const cracker1 = t < blastT ? {y: 2.6 - 5.8 * smooth((t - 0.2) / 1.5), on: true} : {y: 0, on: false};
  const push = at('push') + 0.15;
  const c2t0 = at('drop2') + 0.2;
  const cracker2On = t >= at('closed') && t < push;
  // hovers above the head, bounces on the closed head, then drops through the hole
  const c2y =
    t < c2t0
      ? G.capTop + 0.45 + 0.15 * Math.abs(Math.sin((t - at('closed')) * 4))
      : G.capTop + 0.45 - (G.capTop + 0.65 - G.capY) * smooth((t - c2t0) / 0.8);
  const blasts = [
    {t: blastT, power: 1.3, y: G.groundY + 2.3},
    {t: push, power: 1.0, y: G.capY - 0.25},
  ];

  // ---- valves ----
  const camA = camAngle(theta);
  const camLift = {intake: lobeLift(camA - CAM_PEAK.intake), exhaust: lobeLift(camA - CAM_PEAK.exhaust)};
  const tooth = (x: number) => Math.sin(Math.PI * clamp01(x));
  let intakeLift = 0;
  let exhaustLift = 0;
  const L = G.camLift;
  if (t < at('manual')) {
    if (t >= at('mix') && t < at('burn') && s.k === 0) intakeLift = L * tooth(s.f);
    if (t >= at('block') && t < at('stall') && s.k === 0) intakeLift = 0.5 * L * tooth(s.f);
    if (t >= at('out') && t < at('manual')) exhaustLift = L * window(t, at('out'), at('manual'), 0.3);
  } else if (t < at('cams')) {
    // opened and closed by hand: late and uneven
    intakeLift = lobeLift(camA - CAM_PEAK.intake + 0.7 * Math.sin(t * 2.3));
    exhaustLift = lobeLift(camA - CAM_PEAK.exhaust - 0.6 * Math.sin(t * 1.7 + 1));
  } else if (t < at('rotate')) {
    intakeLift = exhaustLift = 0;
  } else {
    // no springs yet: a valve pushed open stays open
    const sticky = (peak: number) => {
      let m = 0;
      for (let u = at('rotate'); u <= t; u += 1 / 30) m = Math.max(m, lobeLift(camAngle(crankAngle(u)) - peak));
      return m;
    };
    const springOn = ramp(t, at('pull'), 0.6);
    const free = {intake: sticky(CAM_PEAK.intake), exhaust: sticky(CAM_PEAK.exhaust)};
    intakeLift = springOn >= 1 ? camLift.intake : free.intake + (camLift.intake - free.intake) * springOn;
    exhaustLift = springOn >= 1 ? camLift.exhaust : free.exhaust + (camLift.exhaust - free.exhaust) * springOn;
  }

  // ---- gas in the cylinder ----
  const gas: GasState = {fresh: 0, burnt: 0, glow: 0};
  let spray = 0; // fuel spray from the injector
  let spark = 0; // spark plug flash
  let intakeFlow = 0;
  let exhaustFlow = 0;
  let trappedIn = 0; // fresh mix bouncing in the port
  const cycleMode = t >= at('seal');
  if (!cycleMode) {
    if (t >= at('fuel') && t < at('intake')) {
      spray = window(t, at('fuel'), at('nooxy') + 0.8, 0.2);
      gas.fresh = 0.35 * ramp(t, at('fuel'), 1.2);
    }
    if (t >= at('ignite') && t < at('intake')) {
      // the plug sparks but nothing burns (no oxygen)
      const flick = (u: number) => (Math.sin(u * 47) > 0.6 ? 1 : 0);
      spark = 0.6 * flick(t) * (window(t, at('ignite') + 0.3, at('nooxy'), 0.1) + window(t, at('nofire') + 0.2, endOf('nofire'), 0.1));
    }
    if (t >= at('mix') && t < at('burn') + 0.2) {
      gas.fresh = s.k === 0 ? s.f : 1;
      intakeFlow = s.k === 0 ? tooth(s.f) : 0;
    }
    const b = at('burn') + 0.2;
    if (t >= at('burn') && t < b + 0.4) spark = 1;
    if (t >= b && t < at('out')) {
      const k = ramp(t, b, 0.8);
      gas.fresh = 0;
      gas.burnt = 1;
      gas.glow = 1 - k;
    }
    if (t >= at('block') && t < at('out')) {
      trappedIn = intakeLift > 0.01 ? 1 : 0;
      gas.fresh = 0.25 * ramp(t, at('block'), 1);
    }
    if (t >= at('out') && t < at('manual')) {
      const k = ramp(t, at('out'), 1.6);
      gas.burnt = 1 - k;
      exhaustFlow = 1 - k;
    }
  } else {
    // full four-stroke cycle
    const walkSpark = window(t, at('s3'), at('s3') + 0.7, 0.05) * (Math.sin(t * 60) > -0.2 ? 1 : 0.3);
    if (s.k === 0) {
      gas.fresh = s.f;
      intakeFlow = intakeLift / L;
    } else if (s.k === 1) {
      gas.fresh = 1;
      gas.glow = t >= at('s3') && t < at('s3b') ? 0.6 * walkSpark : 0;
    } else if (s.k === 2) {
      gas.burnt = 1;
      gas.glow = 1 - smooth(s.f * 1.6);
      if (s.f < 0.12) spark = 1;
    } else {
      gas.burnt = 1 - s.f;
      exhaustFlow = exhaustLift / L;
    }
    spark = Math.max(spark, walkSpark);
  }
  // engine running mode label during the walkthrough
  const strokeLabel =
    t >= at('s1') && t < endOf('s4b') ? s.k : t >= at('cycle') && t < endOf('cycle') ? -2 : -1;

  return {
    theta,
    stroke: s,
    flip,
    cut,
    lidGone,
    lidFly,
    lidBack,
    pistonMorph,
    show,
    cracker1,
    cracker2: {on: cracker2On, y: c2y},
    blasts,
    camA,
    intakeLift,
    exhaustLift,
    gas,
    spray,
    spark,
    intakeFlow,
    exhaustFlow,
    trappedIn,
    strokeLabel,
  };
}

export type EngineState = ReturnType<typeof engineState>;
