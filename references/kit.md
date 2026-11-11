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

## Camera
`F.focus(target, { azimuth, elevation, pad, snap })`. `target` is an object, a `THREE.Box3`, or nothing for the whole figure. `pad` below 1 zooms in past the bounding box.

## Card
`mech.card(mount, { fig, title, keys: [{ mark: "lit" | "mid", label }], caption })`. The hint is `.mech-hint`, the readout is set with `F.readout`. Put extra controls in a `div.mech-controls` after `.mech-stage`.
