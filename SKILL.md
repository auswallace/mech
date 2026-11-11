---
name: mech
description: Build interactive isometric figures that explain how a machine or system works by modelling it as a real 3D object you can open up. Use when someone asks "show me how X works", wants an explainer figure, a cutaway, an exploded view or an x-ray view of a machine, engine, device, building or system, or asks for an isometric technical illustration. Output is one self-contained HTML page (three.js, orthographic camera, toon shading, edge lines) with stages, live readout and controls.
license: MIT
---

# mech

A figure is a small true model of a real object. The reader steps into it: whole object, cover open, see-through, the mechanism, the inside. Every number on screen comes from one model object in the scene script.

The core is real 3D with an isometric camera. Depth, occlusion, orbit, ghosting, cutaway and exploded views come from the renderer, so you spend your effort on parts and on the model.

## Workflow

1. **Get the facts.** Look up the real numbers before you draw: sizes, counts, order, limits. Write them into one `M` object at the top of the scene. If a number is not verified, do not show it.
2. **Pick the stages.** 3 to 5 steps that go from the outside to the idea. Each stage sets what is solid, what is ghosted, what is hidden, and where the camera looks. Write one plain sentence per stage for the hint line.
3. **List the parts.** At least 60 for a small figure, 150+ for a vehicle or plant. Group them by tag: shell, moving, pipes, and so on. Each part sits on another part.
4. **Build.** Copy `examples/v8-suv/scene.js` as the pattern. World is x forward, y left, z up. Choose one unit (cm works for vehicles, mm for devices) and keep it.
5. **Drive it from the model.** One `F.onFrame` function reads the state, moves the parts and writes the readout. No motion without a cause in the model.
6. **Check it.** Run `node scripts/build.mjs examples/<name>` and `--light`, then `python3 scripts/capture.py examples/<name>/index.html shots`. Read every image. Fix what looks wrong, then look again at the stage that shows the mechanism.

## Rules

- **The object is the explanation.** No boxes with labels and arrows. Words stay in the card: title, hint, readout, keys, caption.
- **Generic shells for real products.** Do not copy a real product's styling, badges or logo. Model the mechanism from published facts and say the shell is generic.
- **One accent.** `lit: true` marks the parts the reader must watch. One warm colour is allowed for heat or fire. Everything else is a tone: `hi`, `mid`, `lo`.
- **Ghost, do not delete.** To show the inside, fade the cover with `F.ghost(tag, 0.07)`. Context stays as thin lines.
- **Slow motion is stated.** If the motion is slowed, say by how much in the caption.
- **Both themes.** Build dark and light. Check moving parts stand out in both.
- **Reduced motion.** The kit stops time-based motion when the reader asks for it. Do not add motion outside `F.onFrame`.

## Kit in one screen

```js
const F = new mech.Figure("#fig", { theme, width: 760, height: 480, azimuth: 38, elevation: 24 });
F.box({ w, d, h, r }, { tone, lit, color, at, rot, tag, group, edges, shadow });   // rounded box standing on z = 0
F.cyl({ r, h, n, axis }, opts);                    // axis "z" stands up, "x" and "y" lie down from the origin
F.tube(points, radius, opts);                      // smooth pipe or cable through 3D points, closed: true for belts
F.add(mech.profileGeo(points, depth, yCentre), opts);   // side profile in x-z, extruded across y, arcs allowed
F.group({ at, rot, group });                       // a frame for parts that move together
F.led(at, r, { color, group, tag });  F.setLed(led, on);
F.screws(points);  F.fins(count, layout, opts);  F.knob(size, opts);
F.ghost(tagOrParts, alpha);                        // 1 solid, 0.07 ghost, 0 hidden
F.focus(objectOrBox3, { azimuth, elevation, pad });     // eased camera move
F.to("name", value, tau);  F.ch("name");           // eased number channels, for hinges and slides
F.glow(mesh, 0..1);  F.shadow(0..1);  F.spin(obj, axis, rpm);
F.onFrame((dt, t) => { ... });  F.readout(text);
mech.card("#fig", { fig, title, keys, caption });
```

Keys built in: drag to orbit, arrow keys to turn, Space calls `F.onPress`.

See `references/kit.md` for details and `references/craft.md` for how to make a figure look made, not generated.
