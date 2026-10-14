import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FRAME} from '../engine/camera';
import {EngineScene} from '../engine/EngineScene';
import {Overlay, SafeGuides} from '../engine/Overlay';
import {engineState} from '../engine/state';
import {VOICE_SECONDS} from '../engine/timeline';

// "How a four-stroke engine is invented from an iron bucket" – vertical video for TikTok.
export const ENGINE_DURATION = Math.ceil((VOICE_SECONDS + 1.2) * FRAME.fps);

const Sky: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: 'linear-gradient(180deg, #2f74d0 0%, #5f9de6 35%, #a9cdf2 62%, #dfe9f5 80%)'}}>
    {[
      {x: 12, y: 8, w: 520, o: 0.85},
      {x: 58, y: 16, w: 640, o: 0.75},
      {x: -10, y: 30, w: 700, o: 0.6},
      {x: 70, y: 40, w: 520, o: 0.55},
      {x: 30, y: 52, w: 820, o: 0.5},
    ].map((c, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${c.x + ((t * (0.25 + i * 0.07)) % 140) - 20}%`,
          top: `${c.y}%`,
          width: c.w,
          height: c.w * 0.32,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0) 70%)',
          opacity: c.o,
          filter: 'blur(6px)',
        }}
      />
    ))}
  </AbsoluteFill>
);

export const EngineTikTok: React.FC<{guides?: boolean}> = ({guides}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const s = engineState(t);
  return (
    <AbsoluteFill>
      <Sky t={t} />
      <ThreeCanvas width={FRAME.width} height={FRAME.height} shadows gl={{alpha: true, antialias: true}} dpr={1}>
        <EngineScene t={t} s={s} />
      </ThreeCanvas>
      <Overlay t={t} s={s} />
      {guides ? <SafeGuides /> : null}
      <Audio src={staticFile('voice/engine.mp3')} />
    </AbsoluteFill>
  );
};
