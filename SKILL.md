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

- **Fact sheet:** every number and claim the figure will show, each with a status and a source. Look them up. Do not use a number from memory as if it were sourced. The sheet becomes the `F.facts([...])` list in the scene. Read `references/accuracy.md`.
- **Shape sheet:** what the real thing looks like, in words, before any geometry. Which way is up. What hangs, what stands, what turns. The 5 to 8 features that make it recognisable. Overall size in the unit you chose. What surrounds it, so the reader has scale (a derailleur needs the wheel, the chain and the cranks).
- **Storyboard:** the stages in order, one sentence each, plus the lesson steps. For each lesson step, name the part that visibly moves or changes. If nothing changes on screen, the step is not ready.

## 3. Pick the subject type

Read `references/subjects.md`. It gives the stage pattern, the motion and the closest example for each type:

- **Machine** (engine, pump, lock): `examples/v8-suv`
- **Structure** (building, bridge, ship hull): `examples/tower`
- **Abstract system** (language model, algorithm): `examples/llm`
- **Conversation** (DNS, TLS, any protocol or handshake between parties): `examples/dns`

For a small machine with real kinematics (links, springs, a chain), read `examples/derailleur` first. It is the reference for the model, the checks and the facts list.

## 4. Size it

- **Figure:** one mechanism, 60 to 150 parts. Build it without asking.
- Count honestly. Copies of one part (chain links, bolts, spokes) count once. The subject itself needs at least 20 distinct parts, apart from its surroundings.
- **Hero:** one object with its surroundings, 150 to 500 parts. Say that it takes longer, then build.
- **Epic:** a whole plant, or several systems that all move. Propose a Hero first.

## 5. Build

Start from `template/scene.js`. Order: model, mechanism, covers, outer shell, part info, labels, stages, lesson, quiz.

- World is x forward, y left, z up. Choose one unit and keep it.
- Group parts by tag and by assembly, so they ghost and come apart together.
- Give every part the reader should learn an `info` key, and describe it once with `F.describe`.
- One `F.onFrame` function reads the state, moves the parts and writes the readout.
- Use the real parts in the kit. `F.gear` for anything with teeth, `mech.wrapPath` and `F.chain` for a chain or belt round wheels, `F.link` for bars and rods between two moving points, `F.spring` for coils. Do not fake them with discs and loose boxes.
- Parts that are fixed to each other go in one group and move as one. Cogs on one hub turn together. A part bolted to the frame does not move.
- Pose comes from the model. If a spring keeps a chain tight, solve the angle that makes the chain length constant. Do not animate by guess.
- Write `F.check(name, ok, detail)` tests that tie the model to the facts: lengths that must stay constant, clearances, order of steps, parts that must line up.

## 6. Check, then report

Run `node scripts/build.mjs examples/<name>` and `--light`, then `python3 scripts/capture.py examples/<name>/index.html shots` and `python3 scripts/sheet.py shots`. Read every image.

The capture prints one audit line per stage and saves every lesson step as an image. Self-review. Fix anything that fails before you report:
- `floating` is empty in every stage. `failedChecks` is empty. No console errors.
- `hiddenLabels` is empty in every stage. If a label points at a hidden spot, move its anchor with `on` or `offset`, or take it out of that set.
- `extents` make sense: each tag has the size you expect in your unit, and things that hang are taller than they are deep.
- `facts.unlinked` and `facts.noSource` are empty. Every `fact` in `F.describe` has a `src` that names an entry in `F.facts`.
- Stranger test: for the first stage, write one line: what would a person who has never seen this figure say it is? If the answer is not the subject, fix the shape or add its surroundings.
- For each lesson image, check that the screen shows what the step text says. A step that claims a motion must show that motion.
- Each stage adds one thing. Each hint states something the reader can see.
- Readout words and numbers come from the model, from the same instant.
- The caption states every simplification, and both themes work.
- Run the second check in `references/accuracy.md` on `shots/audit.json`.

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
- **Every shown fact has a status.** `sourced` (with a link), `model` (worked out), `assumed` (typical value) or `illustrative` (made up). The Sources button on the card shows them to the reader.
- **Plain text.** Short sentences. No dashes used as asides. No brand names unless the subject is that brand's published mechanism.
- **Simplifications are stated.** Slow motion, simplified timing, made-up values and generic shells all go in the caption.
- **Both themes in one page.** The card has a Light/Dark button. Read the theme inside `start()` and keep the `mech-theme` listener from the template, so the button rebuilds the figure.
- **Rest state.** `F.tour` steps through the stages when nobody touches the figure. It stops during a lesson, a quiz or a selection.

## Kit in one screen

```js
const F = new mech.Figure("#fig", { theme, style: "real" | "line", width: 760, height: 480, azimuth: 38, elevation: 24 });
// parts (all stand on z = 0 at their own origin; opts: mat, tone, color, at, rot, tag, info, group, edges, shadow, explode, channel)
F.box({ w, d, h, r }, opts);  F.cyl({ r, h, n, axis }, opts);  F.tube(points, radius, opts);
F.lathe([[radius, height], ...], { axis, n }, opts);  F.torus({ R, r, axis }, opts);  F.plate({ w, d, h, holes }, opts);
F.gear({ teeth, pitch, thick, hole, axis }, opts);  mech.pitchRadius(teeth, pitch);
const path = mech.wrapPath([{ c: [x, z], r, s, y }, ...]);  const chain = F.chain({ count, pitch, width }, opts);  chain.place(path, phase);
const bar = F.link(a, b, { w, d }, opts);  bar.setEnds(a, b);  const coil = F.spring(a, b, { r, turns }, opts);  coil.setEnds(a, b);
F.add(mech.loftGeo(sections, { filter }), opts);  F.add(mech.voluteGeo({ R, r0, r1 }), opts);  F.add(mech.profileGeo(points, depth), opts);
F.group({ at, rot, group, info, explode, channel });  F.led(at, r, opts);  F.screws(points);  F.fins(count, layout, opts);
// materials: castAl machined steel darkSteel iron chrome brass plastic rubber glass paint concrete light
// view and motion
F.ghost(tagOrParts, alpha);  F.focus(objectOrBox3, { azimuth, elevation, pad });  F.to("name", value, tau);  F.ch("name");
F.glow(mesh, 0..1, color);  F.shadow(0..1);  F.onFrame((dt, t) => {});  F.readout(text);  F.tour(stepFn);  F.audit();
// teaching
F.describe({ key: { name, role, fact } });        // click a part with info: key to see this
const L = F.label(key, { on, offset, set, text, pin, box });  F.labels(set);  L.text("new text");   // pointers in two columns, or pinned text
mech.hop(a, b, t, lift);                           // a point on an arc from a to b, for packets between stations
// accuracy
F.facts([{ id, claim, status, source, url }]);  F.describe({ key: { name, role, fact, src: "factId" } });  F.check(name, ok, detail);
F.flow(points, { color, count, speed, r, group, set });  F.flows(set);
const lesson = F.lesson([{ title, text, go() }], { onClose });  lesson.open(0);
const quiz = F.quiz([{ ask, key, also }]);  quiz.start();
mech.card("#fig", { fig, title, keys, caption });
```

References: `references/subjects.md` (stage patterns), `references/accuracy.md` (facts, checks, second check), `references/teach.md` (labels, lessons, quizzes), `references/kit.md` (API detail), `references/craft.md` (making it look made), `references/lessons.md` (mistakes not to repeat).
