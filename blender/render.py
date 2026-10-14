"""Build a shot from blender/scenes/<shot>.py and render it with Cycles.

Usage: npm run blender -- <shot> [--preset draft|final|4k] [--frames 1-60] [--save-blend]
Output: public/blender/<shot>/0001.png ... + manifest.json (read by the BlenderShot composition).
--save-blend also writes out/<shot>.blend to open and tweak in desktop Blender.
"""
import argparse
import importlib
import os
import sys
import time

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'blender'))
import common  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('shot')
ap.add_argument('--preset', default='draft', choices=common.PRESETS)
ap.add_argument('--frames', help='subset to render, e.g. 1-60 or 30')
ap.add_argument('--save-blend', action='store_true')
a = ap.parse_args()

scene = common.reset_scene()
shot = importlib.import_module(f'scenes.{a.shot}')
frames = shot.build(scene)
out_dir = os.path.join(ROOT, 'public', 'blender', a.shot)
os.makedirs(out_dir, exist_ok=True)
common.setup_render(scene, a.preset, out_dir, frames)
common.write_manifest(scene, out_dir)

if a.save_blend:
    os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'out', f'{a.shot}.blend'))

first, last = scene.frame_start, scene.frame_end
if a.frames:
    lo, _, hi = a.frames.partition('-')
    first, last = int(lo), int(hi or lo)
t0 = time.time()
for f in range(first, last + 1):
    scene.frame_set(f)
    scene.render.filepath = os.path.join(out_dir, f'{f:04d}')
    bpy.ops.render.render(write_still=True)
    print(f'frame {f}/{last}  {time.time() - t0:.1f}s', flush=True)
