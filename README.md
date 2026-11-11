# mech

Interactive isometric figures that explain how a machine works by letting you open it up.

A figure is one HTML page. It runs on three.js with an orthographic camera and has two looks: a realistic one with metal, paint and rubber materials, and a line-drawing one with flat tones and edge lines. You step from the whole object to the mechanism inside it. A small model drives the motion and the readout, so the numbers are true.

## Example: twin-turbo V8 in a performance SUV

`examples/v8-suv` has six stages: car, hood up, see-through, engine, apart, inside. It has 477 parts, 32 valves that follow simplified cam timing, and a button that switches between the two looks. The engine follows the published layout of a 4.0 litre, 90 degree, twin-turbo V8: 86 mm bore and stroke, firing order 1-3-7-2-6-5-4-8, turbochargers inside the V, and a 4-cylinder mode that switches off cylinders 2, 3, 5 and 8. The body is an original, generic shell.

```sh
npm install
node scripts/build.mjs examples/v8-suv          # writes examples/v8-suv/index.html
node scripts/build.mjs examples/v8-suv --light  # light theme
python3 scripts/capture.py examples/v8-suv/index.html shots   # screenshots of each stage (needs playwright and Chrome)
```

Open `index.html` in a browser. Keys 1 to 6 change stage, Space goes to the next stage, drag to orbit.

## Use as an agent skill

Copy or clone this repository into your skills folder as `mech` (for example `~/.claude/skills/mech`). Then ask: "use mech to show me how a dishwasher works".

## Layout

- `SKILL.md`: the workflow and rules
- `kit/mech.js`: the renderer and parts
- `scripts/build.mjs`, `scripts/capture.py`: build and check
- `references/`: kit reference and craft notes
- `examples/`: worked figures

MIT license.
