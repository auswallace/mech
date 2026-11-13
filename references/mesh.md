# Parts made in Blender (the mech-mesh add-on)

The kit builds parts from boxes, cylinders, tubes and turned profiles. It is weak at organic and curved shapes, it cannot make a hollow part, and it cannot cut one shape out of another. This add-on brings in parts made by a Blender script. The kit stays the default. Use the add-on only when the subject needs one of these:

- A hollow part with a wall you can see when it is cut (a heart chamber, a tank, a skull).
- A cut: the front of a part removed so the inside shows, with a real cut face.
- Two shapes fused into one (two ventricles into one muscle mass).
- A shape made by moving vertices (a cone that tapers to an apex, a bulge).
- A part that bends or changes shape with a slider (a valve flap, a lens, a bellows).

The reader installs nothing. The figure stays one file that opens in any browser. The author needs Blender once: `pip install bpy` (about 300 MB, Blender as a Python module) or Blender from blender.org.

Example: `examples/heart-blender` (the heart), next to `examples/heart-kit` (the same heart, kit only). `examples/heart-blender/compare/index.html` shows both side by side.

## How it works

1. `parts.py` in the example folder builds every part as a named Blender object and exports one `parts.glb`.
2. `scripts/build.mjs` sees `parts.glb` and puts three extra scripts in the page: the three.js r128 glTF loader (`kit/vendor/GLTFLoader.r128.min.js`), the add-on (`kit/mech-mesh.js`), and the file as base64 in `window.MECH_GLB`.
3. In `scene.js`, `mech.mesh(F, window.MECH_GLB, spec)` reads the file. For each named object it calls `F.add(geometry, opts)`, so the part is a normal kit part. Click, ghost, labels, flow, explode and the audit work the same.

Pages without `parts.glb` build exactly as before. The kit is not changed.

## The Blender script

Put the model numbers at the top of `parts.py`, the same numbers as in `scene.js`. Units are millimetres. Blender is z up, like the kit. The exporter writes y up, and the add-on turns it back.

Rules for the script:

- One object per part. Name it with the key the scene will use: `lv`, `aorta`, `mitral_leaf0`.
- Keep a part that is shown two ways as two objects: `lv` and `lv_cut`. The scene ghosts one and shows the other.
- Bake every location into the vertices before a boolean. Call `bpy.context.view_layer.update()` first; the world matrix is stale until then. The heart script has `apply_transform()` for this.
- Booleans: a modifier of type `BOOLEAN`, solver `EXACT`, applied with `bpy.ops.object.modifier_apply` inside `bpy.context.temp_override(...)`. See `boolean()` in the heart script.
- Hollow part: outer shape minus inner shape (`DIFFERENCE`).
- Cut: minus a big box that covers the side to remove.
- Fuse: `UNION`, then subtract the cavities, then split with `INTERSECT` against a half-space box if the scene needs separate objects.
- Smooth shading: set `use_smooth = True` on every polygon.
- A part that bends: add a shape key `Basis` (the rest pose) and a second key with the bent pose. Name the second key the way the scene will call it, for example `open`.
- Keep spheres at 32 segments and tubes at 24. More segments cost page size and add nothing at figure scale.

Export:

```python
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=True, export_yup=True,
    export_materials="NONE", export_normals=False, export_morph=True, export_morph_normal=False,
    export_animations=False, export_skins=False, export_lights=False, export_cameras=False)
```

`export_normals=False` saves a third of the file; the page computes normals. If a boolean join shows a shading seam, set it to `True` for that figure.

Run with no window: `python3 -I examples/<name>/parts.py`, or `blender -b -P examples/<name>/parts.py`. The script prints the object count, face count, file size and build time.

## The scene

```js
const spec = (name) => {
  if (name === "lv") return { color: MUSCLE, mat: "rubber", tag: "lv", info: "lv", edges: false };
  if (name === "lv_cut") return { color: MUSCLE, mat: "rubber", tag: "lvCut", info: "lv", edges: 60 };
  return null;   // skip objects the figure does not use
};
mech.mesh(F, window.MECH_GLB, spec).then((P) => {
  // P.lv, P.lv_cut ... are normal kit parts. Build the rest of the figure here: describe, labels, flows, stages, card.
});
```

- `spec` takes the object name and returns the options `F.add` takes, or `null`.
- Every part sits at the origin of the figure with its vertices in world units. Do not pass `at`.
- The rest of `start()` goes inside the `.then`, because the loader is asynchronous. The theme switch calls `start()` again and loads again; that takes a few milliseconds.
- To move a baked part, set `position` and `scale` on the mesh. To scale about its own centre `c`: `p.scale.set(s, s, s); p.position.set(c[0] * (1 - s), c[1] * (1 - s), c[2] * (1 - s))`.
- Shape key: `mech.morph(P.mitral_leaf0, "open", 0.7)`. The value runs 0 to 1. The add-on hides the edge lines of a part that bends, because edge lines do not follow a morph.
- Mix freely. A kit tube next to a Blender chamber takes the same materials, lights and edge lines. Flow dots, labels and hinged kit parts sit on Blender parts with no seam.

## Costs and limits

- Page size. The heart is 747 KB: loader 41 KB, add-on 4 KB, mesh 623 KB as base64. Treat 2 to 4 MB as the ceiling. The pip `bpy` has no Draco compression.
- A build step. Two commands instead of one. Keep `parts.py` and `parts.glb` in the example folder and commit both.
- Edge lines at 40 degrees on a smooth mesh give few lines. For a cut face set `edges: 60` so the cut outline shows.
- Explode mode with Blender parts is not tested yet.
- The line view on a part that bends is not tested yet.

## Check before you ship

- Run `capture.py --audit` as for any figure. Blender parts are in the floating check and the label check like any other part.
- Watch for a part at the origin. If every chamber sits at (0, 0, 0), the script did not bake the location before the boolean.
- Watch for a name that matches two rules in `spec`. `pulmonary_leaf0` matched a rule for `pulm` first and lost its valve key. Put the exact matches before the prefix matches.
