# Video3D

3D video pipeline, 1920×1080 at 60 fps:

- **Blender (Cycles)** renders photoreal shots as PNG frame sequences.
- **Remotion** composites those frames with titles, subtitles and audio, and also renders real-time 3D scenes with three.js.

## Videos

| Composition | Format | Content |
|---|---|---|
| `EngineTikTok` | 1080×1920, 30 fps | Four-stroke engine explainer built up from an iron bucket, Vietnamese voice-over (`public/voice/engine.mp3`) |
| `Warehouse3D` | 1920×1080, 60 fps | three.js warehouse demo |
| `BlenderShot` | 1920×1080, 60 fps | Blender Cycles frame sequence with overlays |

### EngineTikTok

- Render: `npx remotion render EngineTikTok out/dong-co-dot-trong-tiktok.mp4`
- Layout check with the TikTok UI zones drawn on top: `npx remotion still EngineTikTok out/check.png --frame=600 --props='{"guides":true}'`
- Safe zones (`src/engine/camera.ts`): top 230 px (tabs, search) and bottom 470 px (caption, description, music) stay free of important content; the engine, labels and subtitles sit between them.
- Timing: `tools/align_voice.py` aligns the subtitle phrases to the voice by counting syllable peaks in the loudness envelope (one peak per Vietnamese word) and writes `src/data/engineVoice.json` with phrase and word times. Every animation beat is keyed to a phrase id, so after replacing the voice file just run `.venv/bin/python tools/align_voice.py` again.
- Code: `src/engine/timeline.ts` (phrase times, crank angle schedule, geometry), `state.ts` (what every part does at time t), `Parts.tsx` / `EngineScene.tsx` (3D), `Overlay.tsx` (subtitles, part labels, stroke bar, titles), `camera.ts` (camera path, safe zones).
- `node tools/stills.mjs EngineTikTok <dir> 1.5,20,60 --guides` renders several check frames with one bundle.

## Setup

```bash
npm install
python3 -m venv .venv && .venv/bin/pip install -r blender/requirements.txt -r tools/requirements.txt
```

In Claude Code cloud sessions, `.claude/hooks/session-start.sh` runs these steps automatically.

Blender is installed as the `bpy` Python module (official Blender Foundation build on PyPI) because `download.blender.org` is blocked in the cloud container. It includes Cycles. Eevee does not run because the container has no GPU. To edit a scene by hand, install desktop Blender 5.2 on your own machine and open the `.blend` written by `--save-blend`.

## Commands

| Command | Purpose |
|---|---|
| `npm run blender -- warehouse --preset draft` | Render a Blender shot to `public/blender/warehouse/` |
| `npm run blender -- warehouse --preset final --frames 1-60` | Final quality, render only part of the shot |
| `npm run blender -- warehouse --save-blend` | Also write `out/warehouse.blend` for desktop Blender |
| `npx remotion render BlenderShot out/shot.mp4` | Composite the Blender frames into an MP4 |
| `npx remotion render Warehouse3D out/w3d.mp4` | Render the three.js scene |
| `npx remotion still <CompositionId> out/x.png --frame=<n>` | Render one frame |
| `npm run studio` | Remotion Studio preview |
| `npm run typecheck` | TypeScript check |

## Blender presets (`blender/common.py`)

| Preset | Resolution | Samples | Use |
|---|---|---|---|
| `draft` | 960×540 | 32 | Check framing and animation |
| `final` | 1920×1080 | 512 adaptive, OIDN denoise | Delivery |
| `4k` | 3840×2160 | 512 adaptive, OIDN denoise | Master, very slow on CPU |

All presets use AgX colour, motion blur, 12 light bounces (`final`/`4k`) and clamped indirect light to avoid fireflies.

Remotion output (`remotion.config.ts`): PNG frames, H.264 CRF 16, x264 `slow`, BT.709, AAC 320 kbps. WebGL uses SwiftShader (`swangle`) because there is no GPU.

## Structure

- `blender/render.py` – CLI: builds `blender/scenes/<shot>.py`, renders it, writes `manifest.json`
- `blender/common.py` – render presets and colour management
- `blender/scenes/` – one file per shot, each exposes `build(scene) -> frame count`
- `src/Root.tsx` – registers compositions
- `src/scenes/BlenderShot.tsx` – plays a Blender frame sequence with overlays
- `src/scenes/Warehouse3D.tsx` – three.js scene via `@remotion/three`
- `src/theme.ts` – colours, video size, fonts (Lexend, Latin + Vietnamese, bundled in `public/fonts/`)
