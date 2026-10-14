import {useMemo} from 'react';
import {
  CatmullRomCurve3,
  Curve,
  DoubleSide,
  ExtrudeGeometry,
  Shape,
  TubeGeometry,
  Vector3,
} from 'three';
import {G, lobeLift, pistonPinY} from './timeline';
import type {EngineState} from './state';

const PI = Math.PI;

// ---------------- materials ----------------
export const M = {
  iron: {color: '#3b4048', metalness: 0.55, roughness: 0.42},
  ironInner: {color: '#2a2e35', metalness: 0.4, roughness: 0.6},
  cutFace: {color: '#8d949e', metalness: 0.7, roughness: 0.35},
  steel: {color: '#b8c0ca', metalness: 0.9, roughness: 0.22},
  darkSteel: {color: '#5b636e', metalness: 0.85, roughness: 0.3},
  alu: {color: '#c9ced6', metalness: 0.85, roughness: 0.25},
  red: {color: '#d4343a', metalness: 0.35, roughness: 0.35},
  spring: {color: '#e3b23c', metalness: 0.7, roughness: 0.3},
  ceramic: {color: '#f2f0ea', metalness: 0.0, roughness: 0.35},
  black: {color: '#16181c', metalness: 0.3, roughness: 0.5},
} as const;

type Mat = (typeof M)[keyof typeof M];
const Std: React.FC<{m: Mat; side?: typeof DoubleSide}> = ({m, side}) => (
  <meshStandardMaterial color={m.color} metalness={m.metalness} roughness={m.roughness} side={side} envMapIntensity={1.1} />
);

// ---------------- cylinder / bucket ----------------
// Built in engine orientation (head on top). `cut` 0 → full bucket, 1 → front half removed.
const R_OUT = G.bore + 0.12;

export const Cylinder: React.FC<{cut: number}> = ({cut}) => {
  const start = (PI / 2) * cut;
  const len = 2 * PI - PI * cut;
  const h = G.capY - G.cylBottom;
  const capH = G.capTop - G.capY;
  const yMid = (G.capY + G.cylBottom) / 2;
  return (
    <group>
      <mesh position={[0, yMid, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R_OUT, R_OUT, h, 96, 1, true, start, len]} />
        <Std m={M.iron} />
      </mesh>
      <mesh position={[0, yMid, 0]} receiveShadow>
        <cylinderGeometry args={[G.bore, G.bore, h, 96, 1, true, start, len]} />
        <Std m={M.ironInner} side={DoubleSide} />
      </mesh>
      {/* head */}
      <mesh position={[0, G.capY + capH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R_OUT, R_OUT, capH, 96, 1, false, start, len]} />
        <Std m={M.iron} />
      </mesh>
      {/* bottom rim */}
      <mesh position={[0, G.cylBottom, 0]} rotation={[PI / 2, 0, 0]}>
        <ringGeometry args={[G.bore, R_OUT, 96, 1, PI / 2 - start - len, len]} />
        <Std m={M.cutFace} side={DoubleSide} />
      </mesh>
      {/* cut faces */}
      {cut > 0.98
        ? [-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * (G.bore + 0.06), (G.cylBottom + G.capY) / 2, 0.001]}>
              <planeGeometry args={[0.12, h]} />
              <Std m={M.cutFace} side={DoubleSide} />
            </mesh>
          ))
        : null}
      {cut > 0.98 ? (
        <mesh position={[0, G.capY + capH / 2, 0.001]}>
          <planeGeometry args={[2 * R_OUT, capH]} />
          <Std m={M.cutFace} side={DoubleSide} />
        </mesh>
      ) : null}
    </group>
  );
};

// ---------------- piston (and the lid it grows from) ----------------
export const Piston: React.FC<{y: number; morph: number}> = ({y, morph}) => {
  // morph 0: flat lid (thin disc); 1: piston with ring grooves and pin boss
  const top = y + G.pinToTop;
  const hgt = 0.14 + (G.pistonH - 0.14) * morph;
  const r = G.bore - 0.025;
  return (
    <group position={[0, top - hgt / 2, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[r, r, hgt, 72]} />
        <meshStandardMaterial
          color={morph < 1 ? '#5a5f66' : M.alu.color}
          metalness={0.6 + 0.25 * morph}
          roughness={0.4 - 0.15 * morph}
          envMapIntensity={1.1}
        />
      </mesh>
      {morph > 0.05
        ? [0.1, 0.2, 0.3].map((d) => (
            <mesh key={d} position={[0, hgt / 2 - d * morph, 0]}>
              <cylinderGeometry args={[r + 0.006, r + 0.006, 0.035, 72]} />
              <Std m={M.black} />
            </mesh>
          ))
        : null}
      {morph > 0.5 ? (
        <mesh position={[0, hgt / 2 - G.pinToTop, r - 0.02]} rotation={[PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.06, 32]} />
          <Std m={M.darkSteel} />
        </mesh>
      ) : null}
    </group>
  );
};

// ---------------- connecting rod ----------------
export const Rod: React.FC<{theta: number; show: number}> = ({theta, show}) => {
  const py = pistonPinY(theta);
  const cx = G.crankR * Math.sin(theta);
  const cy = G.crankY + G.crankR * Math.cos(theta);
  // grows down from the piston pin while appearing
  const ex = cx * show;
  const ey = py + (cy - py) * show;
  const len = Math.hypot(ex, ey - py);
  const ang = Math.atan2(ex, py - ey);
  if (show <= 0.01) return null;
  return (
    <group>
      <mesh position={[ex / 2, (py + ey) / 2, 0]} rotation={[0, 0, ang]} castShadow>
        <boxGeometry args={[0.2, len, 0.14]} />
        <Std m={M.steel} />
      </mesh>
      <mesh position={[0, py, 0]} rotation={[PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.16, 32]} />
        <Std m={M.steel} />
      </mesh>
      {show > 0.95 ? (
        <mesh position={[cx, cy, 0]} rotation={[PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.16, 40]} />
          <Std m={M.steel} />
        </mesh>
      ) : null}
    </group>
  );
};

// ---------------- crankshaft ----------------
export const Crank: React.FC<{theta: number; show: number}> = ({theta, show}) => {
  if (show <= 0.01) return null;
  return (
    <group position={[0, G.crankY - (1 - show) * 3, 0]} rotation={[0, 0, -theta]}>
      {/* main journal along z */}
      <mesh rotation={[PI / 2, 0, 0]} position={[0, 0, -0.35]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 2.2, 32]} />
        <Std m={M.steel} />
      </mesh>
      {/* crank pin */}
      <mesh rotation={[PI / 2, 0, 0]} position={[0, G.crankR, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.42, 32]} />
        <Std m={M.steel} />
      </mesh>
      {[-0.19, 0.19].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, G.crankR / 2, 0]} castShadow>
            <boxGeometry args={[0.36, G.crankR + 0.3, 0.1]} />
            <Std m={M.darkSteel} />
          </mesh>
          {/* counterweight */}
          <mesh rotation={[PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 0.1, 40, 1, false, PI / 2, PI]} />
            <Std m={M.darkSteel} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ---------------- flywheel ----------------
export const Flywheel: React.FC<{theta: number; show: number}> = ({theta, show}) => {
  const teeth = useMemo(() => Array.from({length: 72}, (_, i) => (i / 72) * 2 * PI), []);
  if (show <= 0.01) return null;
  const R = G.flywheelR;
  return (
    <group position={[0, G.crankY, G.flywheelZ - (1 - show) * 6]} rotation={[0, 0, -theta]}>
      <mesh rotation={[PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R, 0.2, 96]} />
        <Std m={M.darkSteel} />
      </mesh>
      <mesh rotation={[PI / 2, 0, 0]} position={[0, 0, 0.11]}>
        <cylinderGeometry args={[R * 0.72, R * 0.72, 0.04, 96]} />
        <Std m={M.iron} />
      </mesh>
      <mesh rotation={[PI / 2, 0, 0]} position={[0, 0, 0.16]}>
        <cylinderGeometry args={[0.32, 0.32, 0.12, 40]} />
        <Std m={M.steel} />
      </mesh>
      {/* bolt holes make the spin visible */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} rotation={[PI / 2, 0, 0]} position={[0.55 * Math.cos((i * PI) / 3), 0.55 * Math.sin((i * PI) / 3), 0.14]}>
          <cylinderGeometry args={[0.07, 0.07, 0.03, 20]} />
          <Std m={M.black} />
        </mesh>
      ))}
      {teeth.map((a) => (
        <mesh key={a} position={[(R + 0.04) * Math.cos(a), (R + 0.04) * Math.sin(a), 0]} rotation={[0, 0, a]}>
          <boxGeometry args={[0.09, 0.05, 0.2]} />
          <Std m={M.darkSteel} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------- firecracker ----------------
export const Firecracker: React.FC<{pos: [number, number, number]; t: number; scale?: number}> = ({pos, t, scale = 1}) => (
  <group position={pos} scale={scale} rotation={[0, 0, 0.25]}>
    <mesh castShadow>
      <cylinderGeometry args={[0.1, 0.1, 0.55, 32]} />
      <meshStandardMaterial color="#d8262c" roughness={0.45} metalness={0.05} />
    </mesh>
    {[0.2, -0.2].map((y) => (
      <mesh key={y} position={[0, y, 0]}>
        <cylinderGeometry args={[0.103, 0.103, 0.06, 32]} />
        <meshStandardMaterial color="#f2c14e" roughness={0.4} metalness={0.4} />
      </mesh>
    ))}
    <mesh position={[0.02, 0.36, 0]} rotation={[0, 0, -0.3]}>
      <cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />
      <Std m={M.black} />
    </mesh>
    {/* burning fuse */}
    <mesh position={[0.05, 0.46, 0]} scale={0.8 + 0.4 * Math.abs(Math.sin(t * 40))}>
      <sphereGeometry args={[0.045, 12, 12]} />
      <meshBasicMaterial color="#ffd36b" toneMapped={false} />
    </mesh>
    <pointLight position={[0.05, 0.5, 0]} color="#ffb347" intensity={2 + Math.abs(Math.sin(t * 33)) * 2} distance={2} />
  </group>
);

// ---------------- explosion ----------------
export const Blast: React.FC<{t: number; t0: number; y: number; power: number; confine?: boolean}> = ({t, t0, y, power, confine}) => {
  const d = t - t0;
  if (d < 0 || d > 1.1) return null;
  const k = d / 1.1;
  const grow = Math.min(1, d / 0.16);
  const R = (confine ? 0.55 : 0.9) * power * grow;
  // fireball: overlapping puffs that rise and cool from yellow to dark orange
  const puffs = Array.from({length: confine ? 7 : 11}, (_, i) => {
    const a = i * 2.399;
    const rr = (0.25 + ((i * 0.37) % 0.6)) * R;
    const up = confine ? 0 : d * 2.2 * (0.6 + (i % 3) * 0.3);
    return {x: Math.cos(a) * rr, y: Math.sin(a * 1.7) * rr * (confine ? 0.4 : 0.8) + up, z: Math.sin(a) * rr * (confine ? 0.3 : 1), s: R * (0.55 + (i % 4) * 0.12)};
  });
  const hot = Math.max(0, 1 - k * 1.6);
  const fire = `rgb(255,${Math.round(120 + 110 * hot)},${Math.round(40 + 120 * hot * hot)})`;
  return (
    <group position={[0, y, 0]}>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} scale={p.s * (1 + 0.4 * k)}>
          <sphereGeometry args={[1, 20, 14]} />
          <meshBasicMaterial color={fire} transparent opacity={(1 - k) ** 1.5 * 0.9} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
      {confine
        ? null
        : Array.from({length: 26}, (_, i) => {
            const a = i * 2.399;
            const el = 0.3 + ((i * 0.53) % 1) * 1.1;
            const v = 4 + (i % 5);
            return (
              <mesh key={`s${i}`} position={[Math.cos(a) * Math.cos(el) * v * d, Math.sin(el) * v * d - 4 * d * d, Math.sin(a) * Math.cos(el) * v * d]}>
                <sphereGeometry args={[0.035, 8, 8]} />
                <meshBasicMaterial color="#ffe08a" toneMapped={false} transparent opacity={1 - k} />
              </mesh>
            );
          })}
      <pointLight color="#ff9a3c" intensity={70 * power * (1 - k) ** 2} distance={14} />
    </group>
  );
};

// ---------------- gas in the chamber ----------------
const FRESH = [0.16, 0.82, 0.74];
const BURNT = [0.55, 0.32, 0.14];
const FIRE = [1.0, 0.62, 0.18];

export const Gas: React.FC<{state: EngineState}> = ({state}) => {
  const {fresh, burnt, glow} = state.gas;
  const amount = Math.min(1, fresh + burnt);
  if (amount < 0.02 && glow < 0.02) return null;
  const top = G.capY;
  const bottom = pistonPinY(state.theta) + G.pinToTop + 0.005;
  const h = Math.max(0.01, top - bottom);
  const w = fresh + burnt > 0 ? burnt / (fresh + burnt) : 0;
  const base = FRESH.map((c, i) => c + (BURNT[i] - c) * w);
  const col = base.map((c, i) => c + (FIRE[i] - c) * glow);
  const color = `rgb(${col.map((c) => Math.round(c * 255)).join(',')})`;
  const opacity = 0.25 + 0.5 * Math.max(amount, glow);
  return (
    <group position={[0, bottom + h / 2, 0]}>
      <mesh>
        <cylinderGeometry args={[G.bore - 0.01, G.bore - 0.01, h, 72, 1, false, PI / 2, PI]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25 + 2.5 * glow} transparent opacity={opacity} depthWrite={false} roughness={1} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[2 * (G.bore - 0.01), h]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25 + 2.5 * glow} transparent opacity={opacity} depthWrite={false} side={DoubleSide} roughness={1} />
      </mesh>
      {glow > 0.05 ? <pointLight color="#ff9a3c" intensity={25 * glow} distance={8} position={[0, 0, 0.6]} /> : null}
    </group>
  );
};

// small particles: swirl inside the chamber, or stream along a port
export const Particles: React.FC<{
  t: number;
  count: number;
  color: string;
  amount: number;
  at: (i: number, u: number) => [number, number, number];
  speed?: number;
  size?: number;
}> = ({t, count, color, amount, at: pos, speed = 0.6, size = 0.035}) => {
  if (amount < 0.02) return null;
  return (
    <group>
      {Array.from({length: Math.round(count * Math.min(1, amount))}, (_, i) => {
        const u = (((i * 0.6180339) % 1) + t * speed) % 1;
        return (
          <mesh key={i} position={pos(i, u)}>
            <sphereGeometry args={[size, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.85 * Math.sin(PI * u)} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------------- head parts ----------------
export const HOLE_X = -0.22;
export const PLUG_X = 0.22;

export const Injector: React.FC<{show: number}> = ({show}) => {
  if (show <= 0.01) return null;
  return (
    <group position={[HOLE_X, (1 - show) * 3, 0]}>
      <mesh position={[0, G.capTop + 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.64, 24]} />
        <Std m={M.steel} />
      </mesh>
      <mesh position={[0, G.capTop + 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.18, 24]} />
        <Std m={M.black} />
      </mesh>
      <mesh position={[0, G.capY - 0.03, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.12, 16]} />
        <Std m={M.darkSteel} />
      </mesh>
    </group>
  );
};

export const SparkPlug: React.FC<{show: number; spark: number; t: number}> = ({show, spark, t}) => {
  if (show <= 0.01) return null;
  return (
    <group position={[PLUG_X, (1 - show) * 3, 0]}>
      <mesh position={[0, G.capTop + 0.06, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.16, 24]} />
        <Std m={M.steel} />
      </mesh>
      <mesh position={[0, G.capTop + 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 0.12, 6]} />
        <Std m={M.steel} />
      </mesh>
      <mesh position={[0, G.capTop + 0.48, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.075, 0.44, 24]} />
        <Std m={M.ceramic} />
      </mesh>
      <mesh position={[0, G.capTop + 0.74, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.1, 16]} />
        <Std m={M.steel} />
      </mesh>
      <mesh position={[0, G.capY - 0.05, 0]}>
        <boxGeometry args={[0.03, 0.1, 0.03]} />
        <Std m={M.steel} />
      </mesh>
      {spark > 0.02 ? (
        <group position={[0, G.capY - 0.11, 0]}>
          <mesh scale={0.6 + 0.6 * Math.abs(Math.sin(t * 80))}>
            <sphereGeometry args={[0.07 * spark + 0.02, 16, 16]} />
            <meshBasicMaterial color="#cfe8ff" toneMapped={false} transparent opacity={spark} />
          </mesh>
          <pointLight color="#9fd0ff" intensity={8 * spark} distance={3} />
        </group>
      ) : null}
    </group>
  );
};

// ---------------- ports, valves, springs, cams ----------------
const portCurve = (side: -1 | 1) =>
  new CatmullRomCurve3([
    new Vector3(side * G.valveX, G.capY - 0.02, 0),
    new Vector3(side * G.valveX, G.capTop + 0.25, 0),
    new Vector3(side * (G.valveX + 0.25), G.capTop + 0.55, 0),
    new Vector3(side * (G.valveX + 0.95), G.capTop + 0.68, 0),
  ]);
export const PORT = {intake: portCurve(-1), exhaust: portCurve(1)};

export const Port: React.FC<{side: -1 | 1; show: number}> = ({side, show}) => {
  const geo = useMemo(() => new TubeGeometry(side < 0 ? PORT.intake : PORT.exhaust, 48, 0.2, 32, false), [side]);
  if (show <= 0.01) return null;
  return (
    <mesh geometry={geo} position={[side * (1 - show) * 3, 0, 0]} castShadow>
      <meshStandardMaterial color={M.darkSteel.color} metalness={0.85} roughness={0.3} side={DoubleSide} />
    </mesh>
  );
};

const SPRING_SEAT = G.capTop + 0.62;
const RETAINER = (lift: number) => G.stemTop - 0.14 - lift;

export const Valve: React.FC<{side: -1 | 1; lift: number; show: number}> = ({side, lift, show}) => {
  if (show <= 0.01) return null;
  const top = G.stemTop - lift;
  const headY = G.capY - 0.03 - lift;
  const stemLen = top - headY;
  return (
    <group position={[side * G.valveX, (1 - show) * 3.5, 0]}>
      <mesh position={[0, headY, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.06, 0.07, 40]} />
        <Std m={M.red} />
      </mesh>
      <mesh position={[0, headY + stemLen / 2, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.032, stemLen, 16]} />
        <Std m={M.steel} />
      </mesh>
      <mesh position={[0, top - 0.02, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
        <Std m={M.red} />
      </mesh>
    </group>
  );
};

class Helix extends Curve<Vector3> {
  constructor(private r: number, private h: number, private turns: number) {
    super();
  }
  getPoint(u: number, target = new Vector3()) {
    const a = u * this.turns * 2 * PI;
    return target.set(this.r * Math.cos(a), u * this.h, this.r * Math.sin(a));
  }
}

export const Spring: React.FC<{side: -1 | 1; lift: number; show: number}> = ({side, lift, show}) => {
  const h = RETAINER(lift) - SPRING_SEAT;
  const geo = useMemo(() => new TubeGeometry(new Helix(0.11, Math.max(0.05, h), 6), 160, 0.018, 8, false), [h]);
  if (show <= 0.01) return null;
  return (
    <group position={[side * G.valveX, 0, 0]} scale={[1, show, 1]}>
      <group position={[0, SPRING_SEAT, 0]}>
        <mesh geometry={geo} castShadow>
          <Std m={M.spring} />
        </mesh>
      </group>
      <mesh position={[0, RETAINER(lift), 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 32]} />
        <Std m={M.red} />
      </mesh>
      <mesh position={[0, SPRING_SEAT - 0.02, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 32]} />
        <Std m={M.red} />
      </mesh>
    </group>
  );
};

const lobeGeometry = (() => {
  const shape = new Shape();
  const n = 96;
  for (let i = 0; i <= n; i++) {
    const b = (i / n) * 2 * PI;
    // nose points down (-y) at rotation 0; lift profile matches lobeLift()
    const r = G.camBase + lobeLift(b + PI / 2);
    const x = r * Math.cos(b);
    const y = r * Math.sin(b);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const g = new ExtrudeGeometry(shape, {depth: 0.2, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2});
  g.translate(0, 0, -0.1);
  return g;
})();

export const Camshaft: React.FC<{side: -1 | 1; rot: number; show: number}> = ({side, rot, show}) => {
  if (show <= 0.01) return null;
  return (
    <group position={[side * G.valveX, G.stemTop + G.camBase + 0.005 + (1 - show) * 4, 0]} rotation={[0, 0, -rot]}>
      <mesh geometry={lobeGeometry} castShadow>
        <Std m={M.steel} />
      </mesh>
      <mesh rotation={[PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 1.6, 24]} />
        <Std m={M.darkSteel} />
      </mesh>
      {[-0.8, 0.8].map((z) => (
        <mesh key={z} rotation={[PI / 2, 0, 0]} position={[0, 0, z]}>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 6]} />
          <Std m={M.darkSteel} />
        </mesh>
      ))}
    </group>
  );
};
