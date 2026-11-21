# Project notes for Video3D (read with SKILL.md)

Installed from https://github.com/mromidev/claude-animated-shorts (commit e3b817b, MIT). Changes in this project are listed below.

## Rules
- The "User rules" in SKILL.md belong to the original skill author: English only, no captions, 2K export, and so on. They do not bind this project. This project's owner makes **Vietnamese** TikTok shorts **with word-highlighted captions**. Follow the owner's current instructions.
- TikTok safe zones for 1080x1920 are in `src/engine/camera.ts`: keep the top 230 px and the bottom 470 px free of important content.
- Vietnamese voice timing: `tools/align_voice.py` (see README).

## Paths in this repo
- Sample short: `src/videos/bridge/`, registered as composition `BridgeShort` in `src/Root.tsx`.
- Skill scripts: `scripts/` (`bridge-stills.mjs`, `short_qa.py`, `sbs_sheet.py`, `bridge_merge.py`, `bridge_shots.py`).
- Audio tools: `.claude/skills/cartoon-3d-short/templates/audio/`. Copy them to the project when making the sound.
- Reference images (`references/frames`, `references/sheets`) are kept out of git because SKILL.md says never to upload them. `.claude/hooks/session-start.sh` downloads them again in cloud sessions.

## Rendering in the cloud container
- There is no GPU. WebGL runs in software through `tools/browser.mjs`, which finds the preinstalled headless shell. `remotion.config.ts` does the same for the CLI.
- `postKick.tsx` is required. The postprocessing EffectComposer registers after Remotion's first `advance`, so without it a still, or the first frame of every render worker, is only the page background.
- Speed: about 30-40 s per still at `--scale 0.5` on CPU, after a bundle of about 40 s. A full 67 s short is very slow here, so render final videos on a machine with a GPU.
- The Kenney CC0 props (`public/bridge/kenney/*.glb`) are not in the upstream repo. They load as 404 and are skipped; the scene still renders. If you need them, get the Kenney Nature Kit and Holiday/Fantasy Town kits from kenney.nl.
