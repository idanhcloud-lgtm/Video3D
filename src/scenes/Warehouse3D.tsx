import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import {useLayoutEffect} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {TitleCard} from '../components/TitleCard';
import {colors, VIDEO} from '../theme';

// Real-time 3D (three.js) inside Remotion: rack rows and a truck moving down the aisle, orbiting camera.
// Good for diagrams and fast iteration; use BlenderShot for photoreal shots.
export const WAREHOUSE_DURATION = 6 * VIDEO.fps;

const RACK_ROWS = [-6, -2, 2, 6];
const RACK_LEN = 16;
const LEVELS = 4;

const Rack: React.FC<{x: number}> = ({x}) => (
  <group position={[x, 0, 0]}>
    {Array.from({length: LEVELS}, (_, i) => (
      <mesh key={i} position={[0, 0.9 + i * 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.08, RACK_LEN]} />
        <meshStandardMaterial color="#d9a93f" metalness={0.6} roughness={0.4} />
      </mesh>
    ))}
    {Array.from({length: LEVELS * 8}, (_, i) => {
      const level = Math.floor(i / 8);
      const slot = i % 8;
      if ((slot * 7 + level * 3 + x) % 5 === 0) return null; // a few empty bins
      return (
        <mesh key={`b${i}`} position={[0, 1.4 + level * 1.6, -RACK_LEN / 2 + 1 + slot * 2]} castShadow>
          <boxGeometry args={[1, 0.9, 1.6]} />
          <meshStandardMaterial color="#b98a55" roughness={0.9} />
        </mesh>
      );
    })}
  </group>
);

// Camera props only apply at creation, so the camera is placed every frame here.
const CameraRig: React.FC<{angle: number}> = ({angle}) => {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(Math.sin(angle) * 22, 11, Math.cos(angle) * 22);
    camera.lookAt(0, 1.5, 0);
  }, [angle, camera]);
  return null;
};

export const Warehouse3D: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  const p = frame / durationInFrames;
  const angle = interpolate(p, [0, 1], [-0.6, 0.6]);
  const truckZ = interpolate(p, [0, 1], [9, -7]);
  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{fov: 40}}
      >
        <CameraRig angle={angle} />
        <color attach="background" args={[colors.bg]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[8, 16, 6]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#2a3142" roughness={0.8} />
        </mesh>
        {RACK_ROWS.map((x) => (
          <Rack key={x} x={x} />
        ))}
        <mesh position={[0, 0.6, truckZ]} castShadow>
          <boxGeometry args={[1.2, 1.2, 2]} />
          <meshStandardMaterial color={colors.green} roughness={0.4} />
        </mesh>
      </ThreeCanvas>
      <TitleCard title="Kho C – 3D" subtitle="three.js / Remotion" />
    </AbsoluteFill>
  );
};
