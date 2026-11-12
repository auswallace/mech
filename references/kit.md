# Kit reference

`kit/mech.js` is one file. It needs the global `THREE` (r128). `scripts/build.mjs` inlines the kit and a scene into one HTML page.

## Coordinates
- x forward (or right), y left (away from the default camera), z up.
- Every primitive stands on z = 0 at its own origin. Place it with `at`, turn it with `rot` (radians, x-y-z order).
- A rotation about x by `-a` tilts a part by angle `a` from vertical toward +y.

## Parts
| Call | Notes |
|---|---|
| `F.box({ w, d, h, r, bevel })` | `w` along x, `d` along y. `r` rounds the plan corners. |
| `F.cyl({ r, h, n, axis })` | `axis: "x"` runs from the origin toward +x. Scale a mesh after creation for ovals. |
| `F.tube(points, r, { closed, n })` | Centripetal spline. Keep bends wider than 2 radii. |
| `mech.profileGeo(points, depth, yCentre)` | Points are `[x, z]`. `{ arc: [cx, cz, r, a0, a1, clockwise] }` adds an arc and draws its own lead-in line, so do not repeat the arc's start point. |
| `F.add(geometry, opts)` | Any BufferGeometry. |

Options for all parts: `tone` (`hi`, `mid`, `lo`), `lit`, `color` (hex, overrides tone), `at`, `rot`, `group`, `tag`, `edges` (crease angle in degrees, or `false`), `shadow`, `explode` (`[dx, dy, dz]`) with `channel`.

## Visibility
`F.ghost(what, alpha)` takes a tag, a mesh, a group, or a list. Opacity eases. At 0 the part is hidden and casts no shadow. Edge lines stay faintly visible on ghosts above 0.

## Motion
- `F.to(name, value, tau)` eases a named number. Read it in `F.onFrame` with `F.ch(name)`.
- Parts with `explode` move by that vector times their channel value. `F.setExplode(1)` drives the default channel.
- `F.setCut({ normal, at })` clips every part with one plane. Use ghosting first; a cut shows hollow shells.

## In motion
- `F.road({ length, width, x, pitch, kerbs, lines, seams, tag })` builds a strip of tarmac at ground level: a dark slab, white edge lines, kerb blocks in two colours and seams across it. Tag is `road`. It returns `{ group, track, slab, pitch, wrap, span, length, move(d) }`.
- `move(d)` scrolls the kerbs and seams by `d` and wraps every two kerb blocks, so the join never shows. `span` is how far the kerbs reach through a whole wrap. The kit keeps it inside the slab.
- Roll a wheel group of radius `r` with `wheel.rotation.y += d / r` for the same `d`. That is rolling without slipping.
- The road is part of the scene, so `F.focus(null)` frames the road. Focus on a `THREE.Box3` round the subject.
- A see-through road fills the screen in a close stage and makes each frame slow. Ghost the `road` tag to 0 there.

## Label anchors
`F.anchors()` moves every hidden pointer of the active label set to a clear spot on its part and returns how many it moved. The kit calls it a few times a second and at the start of `F.audit()`, so you do not call it yourself. A label takes part when it has no `on` point and no `offset`.

## Selection
A click on a part or its label selects its info key. Every part with that key gets a blue tint, a blue glow that breathes slowly, and a blue outline. Blue means "selected" and nothing else, so do not use that blue for a part.

## Camera
`F.focus(target, { azimuth, elevation, pad, snap })`. `target` is an object, a `THREE.Box3`, or nothing for the whole figure. `pad` below 1 zooms in past the bounding box.

## Card
`mech.card(mount, { fig, title, keys: [{ mark: "lit" | "mid", label }], caption })`. The hint is `.mech-hint`, the readout is set with `F.readout`. Put extra controls in a `div.mech-controls` after `.mech-stage`.
