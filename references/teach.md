# Teaching layer

## Part info
- Give a part or a group `info: "key"`. Children of a group inherit the key.
- `F.describe({ key: { name, role, fact } })`. `name` is 1 to 4 words. `role` is one or two plain sentences: what it does and why it matters. `fact` is optional and must be true and sourced.
- A click on a part shows its panel and highlights every part with the same key. A click on empty space clears it.
- Write for the audience from intake. "New to this": no jargon without a definition. "Expert": add the number.

## Labels
- `F.label(key, { set })` points at the first part with that key. Pass `on: mesh` or `on: [x, y, z]` to choose the anchor.
- Labels sit in two columns at the stage edges with leader lines. Keep each set to 8 labels or fewer.
- `pin: true` puts short text at the anchor with no leader. Use it for values and names that belong to one spot (a word on a token, a percentage on a bar).
- One set per stage: `F.labels(set)`. A label hides when its part is ghosted below 0.3.

## Flow
- `F.flow(points, { color, set, group })` moves dots along a path. Put the points in the same frame as the parts (`group`).
- Dots inside an opaque pipe are hidden. Ghost the pipe to about 0.2 when the flow is on.
- Warm colour for hot, heavy or active. Cool colour for fresh, cold or the second path.

## Lesson
- 4 to 6 steps. Each step has a short title, one or two sentences, and a `go()` that sets the view.
- A step shows one thing. Isolate it: ghost the rest, focus the camera, show only its labels, hold the motion in that phase.
- The last step returns to the whole and connects the single unit back to the full system.
- `onClose` restores the normal stage.

## Quiz
- 4 to 5 questions of the form "Click the part that ...". Ask about roles, not names.
- `key` is the right answer. `also` lists other keys that are also correct.
- Start the quiz in a stage where every answer is visible.
