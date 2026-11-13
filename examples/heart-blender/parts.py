"""Build the parts of the heart in Blender and export one .glb.
Run with no window:  python3 -I examples/heart-blender/parts.py   (needs: pip install bpy)
                or:  blender -b -P examples/heart-blender/parts.py
Units: millimetres. z up, x toward the front of the chest, y the body's left. Same numbers as scene.js.
Every part is one named object. The scene script maps the name to a tag, an info key and a colour.
Shape keys named "open" become morph targets. The page drives them with one number per valve."""
import bpy, bmesh, math, os, sys, time
from mathutils import Vector, Matrix

T0 = time.time()
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "parts.glb")
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene

# ---------- the model: the same numbers as scene.js ----------
LV = dict(at=(0, 6, 50), r=30, tall=1.7, wall=11)
RV = dict(at=(15, -20, 50), r=24, tall=1.5, wall=5)
LA = dict(at=(-14, 16, 92), r=21, wall=3)
RA = dict(at=(4, -30, 90), r=22, wall=3)
VALVES = dict(mitral=dict(at=(-8, 12, 73), r=15, n=2, dir=-1), tricuspid=dict(at=(10, -26, 70), r=17, n=3, dir=-1),
              aortic=dict(at=(-2, 2, 96), r=11, n=3, dir=1), pulmonary=dict(at=(20, -8, 92), r=11, n=3, dir=1))
CUT_X = 2.0            # the coronal cut: everything in front of this plane is removed in the "_cut" parts
OPEN_ANGLE = 70        # degrees a leaflet swings when fully open

# ---------- helpers ----------
def link(obj):
    S.collection.objects.link(obj); return obj

def active(obj):
    bpy.context.view_layer.objects.active = obj
    for o in S.objects: o.select_set(o is obj)

def ovoid(name, at, r, tall=1.0, taper=0.0, seg=32):
    """A sphere scaled tall. taper pulls the lower half in toward the apex, so a ventricle reads as a cone, not a ball."""
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    for v in bm.verts:
        z = v.co.z
        v.co.z = z * tall
        if z < 0 and taper:
            k = 1 - taper * (-z / r) ** 1.6
            v.co.x *= k; v.co.y *= k
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); ob.location = at
    for p in me.polygons: p.use_smooth = True
    return link(ob)

def box(name, lo, hi):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector([lo[i] + (v.co[i] + 0.5) * (hi[i] - lo[i]) for i in range(3)])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return link(bpy.data.objects.new(name, me))

def boolean(target, cutter, op):
    """Apply one boolean to target in place. op: DIFFERENCE, UNION, INTERSECT."""
    active(target)
    m = target.modifiers.new("b", "BOOLEAN"); m.operation = op; m.object = cutter; m.solver = "EXACT"
    with bpy.context.temp_override(object=target, active_object=target, selected_objects=[target]):
        bpy.ops.object.modifier_apply(modifier=m.name)

def copy(ob, name):
    c = ob.copy(); c.data = ob.data.copy(); c.name = name; c.data.name = name; return link(c)

def remove(ob):
    me = ob.data; bpy.data.objects.remove(ob); bpy.data.meshes.remove(me)

def apply_transform(ob):
    """Bake the location into the vertices. The world matrix is only current after a view layer update."""
    bpy.context.view_layer.update()
    ob.data.transform(ob.matrix_world); ob.matrix_world = Matrix.Identity(4); ob.location = (0, 0, 0)

def tube(name, points, radius, radii=None, res=24):
    """A smooth tube along a Bezier curve. radii: optional per-point radius factor (a trumpet, a taper)."""
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = radius; cu.bevel_resolution = res // 4; cu.resolution_u = 12
    cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(points) - 1)
    for i, p in enumerate(points):
        b = sp.bezier_points[i]; b.co = Vector(p); b.handle_left_type = b.handle_right_type = "AUTO"
        if radii: b.radius = radii[i]
    ob = link(bpy.data.objects.new(name, cu)); active(ob)
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
        bpy.ops.object.convert(target="MESH")
    ob = bpy.data.objects[name]
    for p in ob.data.polygons: p.use_smooth = True
    return ob

def torus(name, at, R, r, seg=32):
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=False, radius=r, segments=8)
    bmesh.ops.translate(bm, vec=(R, 0, 0), verts=bm.verts)
    bmesh.ops.rotate(bm, cent=(R, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "X"), verts=bm.verts)
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * math.pi, steps=seg, use_merge=True)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); ob.location = at; return link(ob)

def leaflet(name, at, R, n, k, direction):
    """One valve flap: a thin sector of a disc hinged at the ring. Shape key "open" swings it by OPEN_ANGLE about the hinge.
    direction -1 opens down into a ventricle, +1 opens up into an artery. The sector is built as a thin solid so it has two faces."""
    a0 = k / n * 2 * math.pi + 0.3; span = 2 * math.pi / n * 0.96
    rings, arcs = 6, 10
    bm = bmesh.new()
    grid = []
    for i in range(rings + 1):
        row = []
        rad = R * (1 - i / rings) * 0.98       # i = 0 at the ring (hinge), i = rings at the centre
        for j in range(arcs + 1):
            a = a0 - span / 2 + span * j / arcs
            # a cusp: the free edge sags toward the centre line of the valve, so the flaps meet in the middle
            row.append(bm.verts.new((rad * math.cos(a), rad * math.sin(a), 0)))
        grid.append(row)
    for i in range(rings):
        for j in range(arcs):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    res = bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.8)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); ob.location = at; link(ob)
    # shape keys: "Basis" is shut (flat in the ring plane). "open" swings each vertex about the hinge line.
    ob.shape_key_add(name="Basis"); key = ob.shape_key_add(name="open")
    am = a0  # the hinge: the chord of the ring at angle a0, tangent direction
    hinge_pt = Vector((R * 0.98 * math.cos(am), R * 0.98 * math.sin(am), 0))
    axis = Vector((-math.sin(am), math.cos(am), 0))  # tangent to the ring at the hinge
    rot = Matrix.Rotation(math.radians(OPEN_ANGLE) * direction, 4, axis)
    for i, v in enumerate(me.vertices):
        key.data[i].co = rot @ (v.co - hinge_pt) + hinge_pt
    return ob

# ---------- ventricles: one muscle mass with two cavities, then split into lv, rv and septum ----------
lv_out = ovoid("lv_out", LV["at"], LV["r"], LV["tall"], taper=0.55)
rv_out = ovoid("rv_out", RV["at"], RV["r"], RV["tall"], taper=0.45)
lv_in = ovoid("lv_blood", LV["at"], LV["r"] - LV["wall"], LV["tall"] * 0.97, taper=0.55)
rv_in = ovoid("rv_blood", RV["at"], RV["r"] - RV["wall"], RV["tall"] * 0.95, taper=0.45)
for o in (lv_out, rv_out, lv_in, rv_in): apply_transform(o)
myo = copy(lv_out, "myo"); boolean(myo, rv_out, "UNION"); boolean(myo, lv_in, "DIFFERENCE"); boolean(myo, rv_in, "DIFFERENCE")
remove(lv_out); remove(rv_out)
# the right cavity must not open into the left one: the union keeps a wall between them because the inner ovoids do not touch
# split plane between the two cavities, tilted like the real septum
SEP = dict(c=(9, -7, 45), n=Vector((0.55, 0.83, 0)).normalized(), half=2.0)
def halfspace(name, side):
    """A big box with one face on the septum plane. side +1 keeps the side the normal points to."""
    big = 400
    lo, hi = (SEP["half"], big) if side > 0 else (-big, -SEP["half"])
    b = box(name, (lo, -big, -big), (hi, big, big))
    q = Vector((1, 0, 0)).rotation_difference(SEP["n"]).to_matrix().to_4x4()
    b.data.transform(Matrix.Translation(SEP["c"]) @ q)
    return b
left_box = halfspace("left_box", +1); right_box = halfspace("right_box", -1)
lv = copy(myo, "lv"); boolean(lv, left_box, "INTERSECT")
rv = copy(myo, "rv"); boolean(rv, right_box, "INTERSECT")
septum = copy(myo, "septum"); boolean(septum, left_box, "DIFFERENCE"); boolean(septum, right_box, "DIFFERENCE")
remove(myo); remove(left_box); remove(right_box)

# ---------- atria: hollow balls ----------
la = ovoid("la", LA["at"], LA["r"]); la_in = ovoid("la_blood", LA["at"], LA["r"] - LA["wall"])
ra = ovoid("ra", RA["at"], RA["r"]); ra_in = ovoid("ra_blood", RA["at"], RA["r"] - RA["wall"])
for o in (la, la_in, ra, ra_in): apply_transform(o)
boolean(la, la_in, "DIFFERENCE"); boolean(ra, ra_in, "DIFFERENCE")

# ---------- the cut: a copy of each chamber and each blood pool with the front removed ----------
front = box("front", (CUT_X, -300, -300), (300, 300, 300))
for ob in (lv, rv, septum, la, ra, lv_in, rv_in, la_in, ra_in):
    c = copy(ob, ob.name + "_cut"); boolean(c, front, "DIFFERENCE")
remove(front)

# ---------- great vessels ----------
tube("aorta", [(-2, 2, 94), (-2, 2, 118), (-6, 4, 134), (-20, 8, 138), (-34, 10, 126), (-38, 10, 90), (-38, 8, 50)], 12, radii=[1.15, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85])
for i, (x, y) in enumerate([(-8, 4), (-17, 7), (-26, 9)]): tube("aorta_branch%d" % i, [(x, y, 134), (x, y, 160)], 4)
tube("pulm", [(20, -8, 90), (22, -6, 110), (16, 0, 122), (4, 4, 124)], 11, radii=[1.1, 1.0, 1.0, 1.0])
tube("pulm_left", [(6, 4, 124), (0, 30, 120), (-6, 52, 116)], 7); tube("pulm_right", [(6, 4, 124), (2, -26, 122), (-4, -48, 118)], 7)
tube("svc", [(6, -32, 106), (6, -34, 160)], 9); tube("ivc", [(0, -34, 74), (-4, -36, 40), (-6, -36, 10)], 10)
for i, (y, z) in enumerate([(22, 100), (22, 84), (-2, 102), (-2, 86)]): tube("pv%d" % i, [(-24, y, z), (-36, y + 18, z + 2), (-42, y + 34, z + 4)], 5)

# ---------- valves: a ring and flaps with an "open" shape key ----------
for key, v in VALVES.items():
    torus(key + "_ring", v["at"], v["r"], 1.6)
    for k in range(v["n"]): leaflet("%s_leaf%d" % (key, k), v["at"], v["r"], v["n"], k, v["dir"])

# ---------- export ----------
n = len(S.objects); tris = sum(len(o.data.polygons) for o in S.objects if o.type == "MESH")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=True, export_yup=True, export_materials="NONE", export_normals=False,   # the page computes normals, which saves a third of the file
                          export_morph=True, export_morph_normal=False, export_animations=False, export_skins=False, export_lights=False, export_cameras=False)
print("parts.glb: %d objects, %d faces, %d KB, built in %.1f s" % (n, tris, os.path.getsize(OUT) // 1024, time.time() - T0))
