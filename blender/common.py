"""Render settings shared by every Blender shot (Cycles on CPU: the cloud container has no GPU)."""
import json
import os

import bpy

FPS = 60  # must match src/theme.ts VIDEO.fps

PRESETS = {
    # quick look: half resolution, few samples
    'draft': {'res': (960, 540), 'samples': 32, 'threshold': 0.1, 'bounces': 4},
    # delivery: full HD, adaptive sampling + denoiser, full light bounces
    'final': {'res': (1920, 1080), 'samples': 512, 'threshold': 0.01, 'bounces': 12},
    # 4K master (slow on CPU)
    '4k': {'res': (3840, 2160), 'samples': 512, 'threshold': 0.01, 'bounces': 12},
}


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def setup_render(scene, preset, out_dir, frames):
    p = PRESETS[preset]
    r = scene.render
    r.engine = 'CYCLES'
    r.resolution_x, r.resolution_y = p['res']
    r.resolution_percentage = 100
    r.fps = FPS
    r.use_motion_blur = True
    r.motion_blur_shutter = 0.5
    r.use_persistent_data = True  # keep BVH between frames
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGB'
    r.image_settings.color_depth = '8'
    r.image_settings.compression = 15
    r.filepath = os.path.join(out_dir, '####')

    c = scene.cycles
    c.device = 'CPU'
    c.samples = p['samples']
    c.use_adaptive_sampling = True
    c.adaptive_threshold = p['threshold']
    c.use_denoising = True
    c.denoiser = 'OPENIMAGEDENOISE'
    c.max_bounces = p['bounces']
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.sample_clamp_indirect = 10  # removes fireflies

    vs = scene.view_settings
    vs.view_transform = 'AgX'
    vs.look = 'AgX - Medium High Contrast'

    scene.frame_start, scene.frame_end = 1, frames


def write_manifest(scene, out_dir):
    r = scene.render
    with open(os.path.join(out_dir, 'manifest.json'), 'w') as f:
        json.dump({'frames': scene.frame_end - scene.frame_start + 1, 'fps': r.fps,
                   'width': r.resolution_x, 'height': r.resolution_y}, f)
