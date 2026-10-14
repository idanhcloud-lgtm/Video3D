import {useThree} from '@react-three/fiber';
import {useLayoutEffect, useMemo} from 'react';
import {CanvasTexture, PMREMGenerator, RepeatWrapping, SRGBColorSpace, Texture} from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {applyCamera} from './camera';
import {
  Blast,
  Camshaft,
  Crank,
  Cylinder,
  Firecracker,
  Flywheel,
  Gas,
  HOLE_X,
  Injector,
  Particles,
  Piston,
  Port,
  PORT,
  Rod,
  SparkPlug,
  Spring,
  Valve,
} from './Parts';
import {CAM_PEAK, G, pistonPinY, smooth} from './timeline';
import type {EngineState} from './state';

const PI = Math.PI;

const Rig: React.FC<{t: number}> = ({t}) => {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  // studio reflections for the metal parts
  useLayoutEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  useLayoutEffect(() => {
    applyCamera(camera as never, t);
  }, [camera, t]);
  return null;
};

// light grey paving tiles, drawn once
function tileTexture(): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#a9adb3';
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const v = 178 + ((x * 7 + y * 13) % 5) * 5;
      g.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
      g.fillRect(x * 128 + 3, y * 128 + 3, 122, 122);
    }
  }
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(30, 30);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export const EngineScene: React.FC<{t: number; s: EngineState}> = ({t, s}) => {
  const tiles = useMemo(tileTexture, []);
  const pin = pistonPinY(s.theta);

  // bucket → engine block: upright bucket on the ground, flipped and lifted into place
  const bodyRotX = PI * (1 - s.flip);
  const bodyY = (G.groundY + G.capTop) * (1 - s.flip) + Math.sin(PI * s.flip) * 1.2;
  const rimY = -G.cylBottom + G.groundY + G.capTop; // open end of the upright bucket

  // the lid: lands on the upright bucket, is blown off, returns inside as the piston crown
  const lidLand = smooth((t - 1.95) / 0.45);
  const flyH = s.lidFly * 14 + s.lidFly * s.lidFly * 4;
  const engineOn = s.lidBack > 0;

  const flow = (curve: typeof PORT.intake, inward: boolean) => (i: number, u: number): [number, number, number] => {
    const p = curve.getPoint(inward ? 1 - u : u);
    const j = ((i * 37) % 11) / 11 - 0.5;
    return [p.x + j * 0.12, p.y + (((i * 53) % 7) / 7 - 0.5) * 0.12, p.z + j * 0.2];
  };
  const chamber = (i: number, u: number): [number, number, number] => {
    const a = i * 2.399 + u * 2 * PI * 0.3;
    const r = 0.25 + ((i * 0.37) % 0.65);
    const top = G.capY - 0.05;
    const bottom = pin + G.pinToTop + 0.05;
    const y = bottom + ((i * 0.618 + u * 0.4) % 1) * Math.max(0.02, top - bottom);
    return [r * Math.cos(a), y, -Math.abs(r * Math.sin(a)) + 0.05];
  };
  const sprayAt = (i: number, u: number): [number, number, number] => {
    const a = i * 2.399;
    const spread = 0.35 * u;
    return [HOLE_X + spread * Math.cos(a), G.capY - 0.08 - u * 0.5, spread * Math.sin(a) * 0.5];
  };

  return (
    <>
      <Rig t={t} />
      <fog attach="fog" args={['#dfe9f5', 18, 60]} />
      <hemisphereLight args={['#dceaff', '#8a857c', 0.7]} />
      <directionalLight
        position={[6, 14, 9]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-8, 4, -6]} intensity={0.6} color="#bcd4ff" />

      <mesh rotation={[-PI / 2, 0, 0]} position={[0, G.groundY, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial map={tiles} roughness={0.9} metalness={0} />
      </mesh>

      {/* engine block */}
      <group position={[0, bodyY, 0]} rotation={[bodyRotX, 0, 0]}>
        <Cylinder cut={s.cut} />
        {s.show.hole > 0.01 ? (
          <mesh position={[HOLE_X, G.capTop + 0.002, 0]} rotation={[-PI / 2, 0, 0]} scale={s.show.hole}>
            <circleGeometry args={[0.13, 32]} />
            <meshBasicMaterial color="#0b0c0e" />
          </mesh>
        ) : null}
      </group>

      {/* stage 1 lid */}
      {!engineOn && s.flip < 0.01 ? (
        <group
          position={[0, rimY + 0.07 + (1 - lidLand) * 4 + flyH, 0]}
          rotation={[s.lidFly * 5, 0, s.lidFly * 3]}
        >
          <mesh castShadow>
            <cylinderGeometry args={[G.bore + 0.14, G.bore + 0.14, 0.14, 72]} />
            <meshStandardMaterial color="#5a5f66" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ) : null}

      {engineOn ? (
        <group position={[0, -(1 - s.lidBack) * 2.6, 0]}>
          <Piston y={pin} morph={s.pistonMorph} />
        </group>
      ) : null}
      <Rod theta={s.theta} show={s.show.rod} />
      <Crank theta={s.theta} show={s.show.crank} />
      <Flywheel theta={s.theta} show={s.show.flywheel} />

      <Injector show={s.show.injector} />
      <SparkPlug show={s.show.plug} spark={s.spark} t={t} />
      <Port side={-1} show={s.show.intake} />
      <Port side={1} show={s.show.exhaust} />
      <Valve side={-1} lift={s.intakeLift} show={s.show.intake} />
      <Valve side={1} lift={s.exhaustLift} show={s.show.exhaust} />
      <Spring side={-1} lift={s.intakeLift} show={s.show.springs} />
      <Spring side={1} lift={s.exhaustLift} show={s.show.springs} />
      <Camshaft side={-1} rot={s.camA - CAM_PEAK.intake} show={s.show.cams} />
      <Camshaft side={1} rot={s.camA - CAM_PEAK.exhaust} show={s.show.cams} />

      <Gas state={s} />
      <Particles t={t} count={40} color="#9ff3e4" amount={s.gas.fresh} at={chamber} speed={0.25} size={0.03} />
      <Particles t={t} count={40} color="#7a5a3a" amount={s.gas.burnt} at={chamber} speed={0.25} size={0.035} />
      <Particles t={t} count={30} color="#47e0c5" amount={s.intakeFlow} at={flow(PORT.intake, true)} speed={1.2} />
      <Particles t={t} count={30} color="#8a6a4a" amount={s.exhaustFlow} at={flow(PORT.exhaust, false)} speed={1.2} size={0.045} />
      <Particles t={t} count={30} color="#47e0c5" amount={s.trappedIn} at={(i, u) => flow(PORT.intake, true)(i, 0.6 * Math.sin(PI * u))} speed={1.5} />
      <Particles t={t} count={36} color="#f5d76e" amount={s.spray} at={sprayAt} speed={1.6} size={0.025} />

      {s.cracker1.on ? <Firecracker pos={[0, Math.max(G.groundY + 0.42, s.cracker1.y), 0]} t={t} /> : null}
      {s.cracker2.on ? <Firecracker pos={[HOLE_X, s.cracker2.y, 0]} t={t} scale={0.6} /> : null}
      <Blast t={t} t0={s.blasts[0].t} y={s.blasts[0].y} power={s.blasts[0].power} />
      <Blast t={t} t0={s.blasts[1].t} y={G.capY - 0.3} power={1} confine />
    </>
  );
};
