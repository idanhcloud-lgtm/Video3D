#!/bin/bash
# Installs the render toolchain in Claude Code cloud sessions:
# npm deps (Remotion, three.js), Blender as a Python module (bpy, from PyPI;
# download.blender.org is not reachable from the cloud container) and numpy/scipy for tools/.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

npm install --no-audit --no-fund

if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install -q -r blender/requirements.txt -r tools/requirements.txt

# Style reference frames for the cartoon-3d-short skill (kept out of git). Optional: skip quietly on failure.
REF=.claude/skills/cartoon-3d-short/references
if [ ! -d "$REF/sheets" ]; then
  TMP=$(mktemp -d)
  if git clone -q --filter=blob:none https://github.com/mromidev/claude-animated-shorts.git "$TMP/s" 2>/dev/null \
    && git -C "$TMP/s" checkout -q e3b817b 2>/dev/null; then
    cp -r "$TMP/s/references/frames" "$TMP/s/references/sheets" "$REF/" || true
  fi
  rm -rf "$TMP"
fi
