"""Warehouse aisle: rack rows with cartons, a reach truck driving down the aisle, camera dolly following it."""
import math

import bpy

SECONDS = 4
RACK_ROWS = [-6.0, -2.0, 2.0, 6.0]  # x of each rack row; aisles run along y between them
RACK_LEN, LEVELS, BAYS = 24.0, 4, 10


def material(name, color, rough=0.5, metal=0.0, emit=0.0):
    m = bpy.data.materials.new(name)
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emit:
        bsdf.inputs['Emission Color'].default_value = (*color, 1)
        bsdf.inputs['Emission Strength'].default_value = emit
    return m


def box(name, size, loc, mat, mesh=None):
    if mesh is None:
        bpy.ops.mesh.primitive_cube_add(size=1)
        o = bpy.context.object
        o.name = name
        o.scale = size
        bpy.ops.object.transform_apply(scale=True)
        bevel = o.modifiers.new('bevel', 'BEVEL')
        bevel.width, bevel.segments = 0.01, 2
        o.data.materials.append(mat)
    else:  # linked duplicate: shares mesh data, cheap for hundreds of cartons
        o = bpy.data.objects.new(name, mesh.data)
        for mod in mesh.modifiers:
            o.modifiers.new(mod.name, mod.type).width = mod.width
        bpy.context.collection.objects.link(o)
    o.location = loc
    return o


def build(scene):
    steel = material('steel_orange', (0.85, 0.32, 0.05), rough=0.35, metal=0.8)
    upright = material('steel_blue', (0.05, 0.15, 0.45), rough=0.4, metal=0.8)
    carton = material('carton', (0.55, 0.38, 0.22), rough=0.85)
    floor = material('floor', (0.35, 0.36, 0.38), rough=0.25)
    stripe = material('stripe', (0.95, 0.75, 0.05), rough=0.5)
    truck = material('truck', (0.10, 0.75, 0.50), rough=0.3, metal=0.2)

    bpy.ops.mesh.primitive_plane_add(size=80)
    bpy.context.object.data.materials.append(floor)

    beam = upright_mesh = carton_mesh = None
    bay = RACK_LEN / BAYS
    for x in RACK_ROWS:
        for lvl in range(LEVELS):
            z = 0.15 + lvl * 1.8
            beam = box('beam', (1.1, RACK_LEN, 0.1), (x, 0, z), steel, beam)
            for b in range(BAYS):
                if (b * 7 + lvl * 3 + int(x)) % 6 == 0:
                    continue  # empty bin
                y = -RACK_LEN / 2 + bay * (b + 0.5)
                carton_mesh = box('carton', (1.0, bay * 0.8, 1.2), (x, y, z + 0.65), carton, carton_mesh)
        for b in range(BAYS + 1):
            for dx in (-0.5, 0.5):
                upright_mesh = box('upright', (0.08, 0.08, LEVELS * 1.8),
                                   (x + dx, -RACK_LEN / 2 + b * bay, LEVELS * 0.9), upright, upright_mesh)
    for x in (-4.0, 0.0, 4.0):  # aisle edge lines
        for dx in (-1.2, 1.2):
            box('stripe', (0.1, RACK_LEN + 4, 0.005), (x + dx, 0, 0.003), stripe)

    # reach truck: body + mast + forks, parented to an empty that drives down the middle aisle
    rig = bpy.data.objects.new('truck_rig', None)
    scene.collection.objects.link(rig)
    for name, size, loc, mat in [
        ('body', (1.2, 1.6, 1.1), (0, 0, 0.7), truck),
        ('mast', (1.0, 0.15, 3.2), (0, -0.9, 1.75), upright),
        ('fork_l', (0.12, 1.1, 0.05), (-0.3, -1.5, 0.3), steel),
        ('fork_r', (0.12, 1.1, 0.05), (0.3, -1.5, 0.3), steel),
        ('light', (0.3, 0.05, 0.1), (0, -0.82, 1.1), material('lamp', (1, 0.9, 0.6), emit=15)),
    ]:
        box(name, size, loc, mat).parent = rig
    frames = SECONDS * 60
    for f, y in [(1, 14.0), (frames, -8.0)]:
        rig.location = (0, y, 0)
        rig.keyframe_insert('location', frame=f)

    # lights: warm high-bay area lights + cool sky
    for i, y in enumerate(range(-12, 13, 6)):
        bpy.ops.object.light_add(type='AREA', location=(0, y, 9))
        light = bpy.context.object.data
        light.size, light.energy, light.color = 4, 900, (1.0, 0.92, 0.82)
    world = bpy.data.worlds.new('world')
    world.color = (0.02, 0.03, 0.06)
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.02, 0.03, 0.06, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    scene.world = world

    # camera: low dolly behind the truck, slight drift, depth of field on the truck
    cam_data = bpy.data.cameras.new('cam')
    cam_data.lens = 35
    cam_data.dof.use_dof = True
    cam_data.dof.focus_object = rig
    cam_data.dof.aperture_fstop = 4
    cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    for f, loc in [(1, (2.5, 22.0, 3.2)), (frames, (-1.5, 2.0, 2.4))]:
        cam.location = loc
        cam.keyframe_insert('location', frame=f)
    track = cam.constraints.new('TRACK_TO')
    track.target = rig
    track.track_axis, track.up_axis = 'TRACK_NEGATIVE_Z', 'UP_Y'
    return frames
