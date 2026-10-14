import {PerspectiveCamera, Vector3} from 'three';
import {at, smooth, VOICE_SECONDS} from './timeline';

// Vertical 1080×1920 for TikTok. The 3D picture is shifted up so the engine sits between the top UI
// (tabs, search) and the caption/description at the bottom.
export const FRAME = {width: 1080, height: 1920, fps: 30};
export const SAFE = {top: 230, bottom: 470}; // px kept clear of important content
export const VIEW_SHIFT = 110; // px: moves the 3D picture up
export const FOV = 38;

type Key = {t: number; pos: [number, number, number]; target: [number, number, number]; move?: number};

// Full engine (ground y -3.6 to cams y 2.6) fits between the TikTok top bar and the subtitles at
// distance ~17 looking at y -0.6; closer shots are used only while the engine is still short.
const KEYS: Key[] = [
  {t: 0, pos: [3.0, 3.2, 10.5], target: [0, -2.6, 0]},
  {t: at('flip') - 0.2, pos: [3.5, 0.6, 15.0], target: [0, -1.2, 0], move: 1.6},
  {t: at('rod'), pos: [3.5, 0.5, 15.5], target: [0, -1.1, 0], move: 1.8},
  {t: at('closed'), pos: [2.5, 3.0, 12.5], target: [0, -0.2, 0], move: 1.4},
  {t: at('return'), pos: [3.5, 0.5, 15.5], target: [0, -1.1, 0], move: 1.2},
  {t: at('flywheel'), pos: [8.0, 1.6, 14.0], target: [0, -1.2, -0.3], move: 1.6},
  {t: at('injector'), pos: [3.0, 2.6, 15.5], target: [0, -0.8, 0], move: 1.4},
  {t: at('intake') - 0.2, pos: [3.0, 1.8, 16.5], target: [0, -0.7, 0], move: 1.4},
  {t: at('cams') - 0.2, pos: [3.6, 3.0, 17.0], target: [0, -0.6, 0], move: 1.4},
  {t: at('springs'), pos: [2.2, 3.4, 16.5], target: [0, -0.5, 0], move: 1.4},
  {t: at('sync'), pos: [6.5, 2.4, 16.0], target: [0, -0.6, 0], move: 1.6},
  {t: at('s1') - 0.4, pos: [3.0, 1.4, 17.0], target: [0, -0.6, 0], move: 1.2},
  {t: at('congrats'), pos: [9.0, 3.4, 18.5], target: [0, -0.7, 0], move: 2.5},
  {t: VOICE_SECONDS + 5, pos: [9.0, 3.4, 18.5], target: [0, -0.7, 0]},
];

const lerp3 = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k) as [number, number, number];

export function cameraAt(t: number) {
  let i = 0;
  while (i + 1 < KEYS.length && KEYS[i + 1].t <= t) i++;
  const prev = KEYS[Math.max(0, i - 1)];
  const cur = KEYS[i];
  // move from the previous key to the current one over `move` seconds
  const k = i === 0 ? 1 : smooth((t - cur.t) / (cur.move ?? 1.2));
  let pos = lerp3(prev.pos, cur.pos, k);
  const target = lerp3(prev.target, cur.target, k);
  // slow orbit while the finished engine runs
  const orbit = t >= at('sync') && t < at('s1') - 0.4 ? (t - at('sync')) * 0.25 : t >= at('congrats') ? (t - at('congrats')) * 0.18 : 0;
  if (orbit) {
    const c = Math.cos(orbit);
    const s = Math.sin(orbit);
    pos = [pos[0] * c - pos[2] * s, pos[1], pos[0] * s + pos[2] * c];
  }
  // a short shake on each blast
  for (const b of [at('blast') + 0.35, at('push') + 0.15]) {
    const d = t - b;
    if (d > 0 && d < 0.5) {
      const a = 0.12 * (1 - d / 0.5);
      pos = [pos[0] + a * Math.sin(d * 90), pos[1] + a * Math.cos(d * 70), pos[2]];
    }
  }
  return {pos, target};
}

export function applyCamera(camera: PerspectiveCamera, t: number) {
  const {pos, target} = cameraAt(t);
  camera.fov = FOV;
  camera.aspect = FRAME.width / FRAME.height;
  camera.setViewOffset(FRAME.width, FRAME.height, 0, VIEW_SHIFT, FRAME.width, FRAME.height);
  camera.position.set(...pos);
  camera.lookAt(...target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

// Screen position (px) of a world point at time t, for the 2D labels.
const projector = new PerspectiveCamera();
export function toScreen(t: number, p: [number, number, number]) {
  applyCamera(projector, t);
  const v = new Vector3(...p).project(projector);
  return {x: ((v.x + 1) / 2) * FRAME.width, y: ((1 - v.y) / 2) * FRAME.height, behind: v.z > 1};
}
