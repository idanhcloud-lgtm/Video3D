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
