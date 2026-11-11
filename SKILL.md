---
name: mech
description: Build interactive 3D figures that show and teach how something works by letting the reader open it up. Use when someone asks "show me how X works", "show me inside X", "teach me X visually", or wants an explainer, cutaway, exploded view, x-ray view or teardown of a machine, device, vehicle, building, system or abstract idea (a network, an algorithm, a language model). Output is one self-contained HTML page with stages, labels, click-to-learn part info, a guided lesson, flow paths, a quiz and a live readout.
license: MIT
---

# mech

A figure is a small true model of a thing that the reader can step into: whole object, cover open, see-through, mechanism, apart, inside. The reader can click any part to learn what it does, follow a lesson, and test themselves. Every number on screen comes from one model object in the scene script.

The core is real 3D with an isometric camera. Depth, orbit, ghosting and exploded views come from the renderer. You spend your effort on the model, the parts and the teaching.

## 1. Intake: three questions, asked as options

Infer first. Ask only what the request does not already answer. Ask at most three questions, as tap options with the default first (use the option-question tool if there is one). If the user says "just build it", or nobody is there to answer, pick the defaults and state them in one line.

1. **How deep?** Quick look (3 stages and labels) / **Guided lesson** (default: stages, labels, click to learn, lesson) / Full teardown (adds apart view, flow and quiz).
2. **Who is it for?** **New to this** (default: plain words, analogies) / Some background (correct terms) / Expert (real numbers, edge cases).
3. **What matters most?** Write 2 to 4 options for this subject. Example for an engine: how it makes power / how the turbos work / where everything is. This sets what the figure centres on.

Do not ask about look or size. Pick them and say so: "Guided lesson, for someone new, centred on how it moves heat. About 150 parts, realistic look."

## 2. Fact sheet, then storyboard

Show both to the user before you build. They are cheap to fix. A built figure is not.

- **Fact sheet:** a short table of the numbers and claims the figure will show, each with its source. Look them up. If a number is not verified, do not show it. Mark anything illustrative as illustrative.
- **Storyboard:** the stages in order, one sentence each, plus the lesson steps if there is a lesson.

## 3. Pick the subject type

Read `references/subjects.md`. It gives the stage pattern, the motion and the closest example for each type:

- **Machine** (engine, pump, lock): `examples/v8-suv`
- **Structure** (building, bridge, ship hull): `examples/tower`
- **Abstract system** (language model, network, algorithm): `examples/llm`

## 4. Size it

- **Figure:** one mechanism, 60 to 150 parts. Build it without asking.
- **Hero:** one object with its surroundings, 150 to 500 parts. Say that it takes longer, then build.
- **Epic:** a whole plant, or several systems that all move. Propose a Hero first.

## 5. Build

Start from `template/scene.js`. Order: model, mechanism, covers, outer shell, part info, labels, stages, lesson, quiz.

- World is x forward, y left, z up. Choose one unit and keep it.
- Group parts by tag and by assembly, so they ghost and come apart together.
- Give every part the reader should learn an `info` key, and describe it once with `F.describe`.
- One `F.onFrame` function reads the state, moves the parts and writes the readout.

## 6. Check, then report

Run `node scripts/build.mjs examples/<name>` and `--light`, then `python3 scripts/capture.py examples/<name>/index.html shots` and `python3 scripts/sheet.py shots`. Read every image.

Self-review. Fix anything that fails before you report:
- The capture prints `fig.audit()`. `floating` is an empty list.
- No console errors. Both themes build.
- The main idea is visible in one stage without reading the caption.
- Each stage adds one thing. Each hint states something the reader can see.
- Labels point at the right parts and do not cover the subject.
- Readout numbers match the model. The caption states every simplification.

Report in this shape: what you built, what you checked, what you simplified, what you did not test.

When a review finds a mistake that could happen again, add one line to `references/lessons.md`.

## Rules

- **The object is the explanation.** No boxes with arrows between them.
- **Words are short and attached.** Labels are names, 1 to 4 words. Explanations go in the part panel, the lesson strip and the caption.
- **Original shells for real products.** Do not copy a real product's styling, badges or logo. Model the mechanism from published facts and say the shell is generic.
- **Abstract subjects get a layout where position means something.** State the meaning of each axis in the caption, and say that it is a map of the idea, not a picture of hardware.
- **Round things are round.** `F.lathe` for turned parts, `mech.voluteGeo` for scrolls, `mech.loftGeo` for bodywork, `F.tube` for pipes.
- **Colour is rationed.** Watched parts are `machined`. Warm colour means heat, weight or the active signal. Cool colour means fresh air, cold or a second path. Blue highlight means "selected".
- **Ghost, do not delete.** Fade covers with `F.ghost(tag, 0.06)`. A closed shell hides what is inside it, so ghost it or cut an opening.
- **Flow shows direction, not speed.** Say so in the caption.
- **Simplifications are stated.** Slow motion, simplified timing, made-up values and generic shells all go in the caption.
- **Both themes in one page.** The card has a Light/Dark button. Read the theme inside `start()` and keep the `mech-theme` listener from the template, so the button rebuilds the figure.
- **Rest state.** `F.tour` steps through the stages when nobody touches the figure. It stops during a lesson, a quiz or a selection.

## Kit in one screen

```js
const F = new mech.Figure("#fig", { theme, style: "real" | "line", width: 760, height: 480, azimuth: 38, elevation: 24 });
// parts (all stand on z = 0 at their own origin; opts: mat, tone, color, at, rot, tag, info, group, edges, shadow, explode, channel)
F.box({ w, d, h, r }, opts);  F.cyl({ r, h, n, axis }, opts);  F.tube(points, radius, opts);
F.lathe([[radius, height], ...], { axis, n }, opts);  F.torus({ R, r, axis }, opts);  F.plate({ w, d, h, holes }, opts);
F.add(mech.loftGeo(sections, { filter }), opts);  F.add(mech.voluteGeo({ R, r0, r1 }), opts);  F.add(mech.profileGeo(points, depth), opts);
F.group({ at, rot, group, info, explode, channel });  F.led(at, r, opts);  F.screws(points);  F.fins(count, layout, opts);
// materials: castAl machined steel darkSteel iron chrome brass plastic rubber glass paint concrete light
// view and motion
F.ghost(tagOrParts, alpha);  F.focus(objectOrBox3, { azimuth, elevation, pad });  F.to("name", value, tau);  F.ch("name");
F.glow(mesh, 0..1, color);  F.shadow(0..1);  F.onFrame((dt, t) => {});  F.readout(text);  F.tour(stepFn);  F.audit();
// teaching
F.describe({ key: { name, role, fact } });        // click a part with info: key to see this
F.label(key, { on, set, text, pin });  F.labels(set);     // pointers in two columns, or pinned text
F.flow(points, { color, count, speed, r, group, set });  F.flows(set);
const lesson = F.lesson([{ title, text, go() }], { onClose });  lesson.open(0);
const quiz = F.quiz([{ ask, key, also }]);  quiz.start();
mech.card("#fig", { fig, title, keys, caption });
```

References: `references/subjects.md` (stage patterns), `references/teach.md` (labels, lessons, quizzes), `references/kit.md` (API detail), `references/craft.md` (making it look made), `references/lessons.md` (mistakes not to repeat).
