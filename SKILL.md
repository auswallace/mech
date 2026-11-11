---
name: mech
description: Build interactive isometric figures that explain how a machine or system works by modelling it as a real 3D object you can open up. Use when someone asks "show me how X works", wants an explainer figure, a cutaway, an exploded view or an x-ray view of a machine, engine, device, building or system, or asks for an isometric technical illustration. Output is one self-contained HTML page (three.js, orthographic camera, toon shading, edge lines) with stages, live readout and controls.
license: MIT
---

# mech

A figure is a small true model of a real object. The reader steps into it: whole object, cover open, see-through, the mechanism, the inside. Every number on screen comes from one model object in the scene script.

The core is real 3D with an isometric camera. Depth, occlusion, orbit, ghosting, cutaway and exploded views come from the renderer, so you spend your effort on parts and on the model.

## Workflow

1. **Size it.** Name the tier before you start, and tell the user.
   - **Figure:** one mechanism, 60 to 150 parts. Build it without asking.
   - **Hero:** one object with its surroundings, 150 to 500 parts (the V8 SUV example is 477). Say that it takes longer, then build.
   - **Epic:** a whole plant, or several systems that all move. Propose a Hero first. Build the Epic only when the user picks it.
2. **Get the facts.** Look up the real numbers before you draw: sizes, counts, order, limits. Write them into one `M` object at the top of the scene. If a number is not verified, do not show it.
3. **Pick the stages.** 3 to 6 steps that go from the outside to the idea: whole object, cover open, see-through, mechanism, apart, inside. Each stage sets what is solid, ghosted or hidden, and where the camera looks. Write one plain sentence per stage for the hint line.
4. **List the parts.** Group them by tag (shell, moving, pipes, and so on) and by assembly, so they can ghost and come apart together. Each part sits on another part.
5. **Build.** Copy `examples/v8-suv/scene.js` as the pattern. Mechanism first, covers second, outer body last. World is x forward, y left, z up. Choose one unit and keep it.
6. **Drive it from the model.** One `F.onFrame` function reads the state, moves the parts and writes the readout. No motion without a cause in the model.
7. **Check it.** Run `node scripts/build.mjs examples/<name>` and `--light`, then `python3 scripts/capture.py examples/<name>/index.html shots` and `python3 scripts/sheet.py shots`. The capture prints `fig.audit()`: `floating` must be an empty list. Read every image. Fix, then look again.

## Two looks

- `style: "real"`: physically based metal, paint, rubber and glass under studio lighting. Use named materials: `mat: "castAl" | "machined" | "steel" | "darkSteel" | "iron" | "chrome" | "brass" | "plastic" | "rubber" | "glass" | "paint" | "light"`.
- `style: "line"`: flat tones with edge lines, for docs and print. The same `mat` names map to tones, so one scene serves both looks.

## Rules

- **The object is the explanation.** No boxes with labels and arrows. Words stay in the card: title, hint, readout, keys, caption.
- **Original shells for real products.** Do not copy a real product's styling, badges or logo. Design an original body in the same size class, model the mechanism from published facts, and say in the caption that the shell is generic.
- **Round things are round.** Use `F.lathe` for anything turned, `mech.voluteGeo` for scroll housings, `mech.loftGeo` for bodywork, `F.tube` for pipes. Keep boxes for castings and covers, and round their corners.
- **One accent.** The watched parts are `machined` (or `lit` in line style). One warm colour is allowed for heat or fire, driven by load.
- **Ghost, do not delete.** To show the inside, fade the cover with `F.ghost(tag, 0.06)`. Context stays as thin lines.
- **Apart is by assembly.** Give each assembly one `explode` vector and a channel. Start the channels with different `tau` values so the parts leave in order.
- **Simplifications are stated.** Slow motion, simplified timing and generic shells go in the caption.
- **Both themes, both looks.** Check that moving parts stand out in each.
- **Rest state.** `F.tour` steps through the stages when nobody touches the figure. The kit stops motion when the reader asks for reduced motion.

## Kit in one screen

```js
const F = new mech.Figure("#fig", { theme, style: "real", width: 760, height: 480, azimuth: 38, elevation: 24 });
F.box({ w, d, h, r }, { mat, tone, lit, color, at, rot, tag, group, edges, shadow, explode, channel });   // rounded box standing on z = 0
F.cyl({ r, h, n, axis }, opts);                    // axis "z" stands up, "x" and "y" lie down from the origin
F.tube(points, radius, opts);                      // smooth pipe or cable through 3D points, closed: true for belts
F.add(mech.profileGeo(points, depth, yCentre), opts);   // side profile in x-z, extruded across y, arcs allowed
F.lathe([[radius, height], ...], { axis, n }, opts);   // turned parts: pistons, pulleys, housings, tyres
F.torus({ R, r, axis }, opts);                     // clamps, rings, seals
F.add(mech.voluteGeo({ R, r0, r1 }), opts);        // scroll housing for a turbo or pump
F.add(mech.loftGeo(sections, { filter }), opts);   // smooth skin over cross-sections, with sweep() and superSection()
F.group({ at, rot, group });                       // a frame for parts that move together
F.led(at, r, { color, group, tag });  F.setLed(led, on);
F.screws(points);  F.fins(count, layout, opts);  F.knob(size, opts);
F.ghost(tagOrParts, alpha);                        // 1 solid, 0.07 ghost, 0 hidden
F.focus(objectOrBox3, { azimuth, elevation, pad });     // eased camera move
F.to("name", value, tau);  F.ch("name");           // eased number channels, for hinges and slides
F.glow(mesh, 0..1);  F.shadow(0..1);  F.spin(obj, axis, rpm);
F.tour(stepFn, { idle, every });  F.audit();       // idle tour, and the part count plus floating-part check
F.onFrame((dt, t) => { ... });  F.readout(text);
mech.card("#fig", { fig, title, keys, caption });
```

Keys built in: drag to orbit, arrow keys to turn, Space calls `F.onPress`.

See `references/kit.md` for details and `references/craft.md` for how to make a figure look made, not generated.
