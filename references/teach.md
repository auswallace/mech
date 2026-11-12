# Teaching layer

## Part info
- Give a part or a group `info: "key"`. Children of a group inherit the key.
- `F.describe({ key: { name, what, does, how, fact, src } })`. `name` is 1 to 4 words. The panel shows three fixed lines:
  - `what`: what it is. One plain sentence.
  - `does`: what it does. One sentence.
  - `how`: how it does it. One or two sentences. Leave it out if you cannot say it truthfully.
- One claim for each sentence. Write it so plain that nobody can argue with it. If a sentence needs a source and has none, cut it.
- `fact` is optional: one number or one hard fact. `src` is one fact id or a list. The panel shows a tag for each source with its status (sourced, worked out, assumed, illustrative). With no `src`, the panel says "common knowledge, no source".
- The old form `role` still works, but it gives one block of text. Use the three lines for new figures.
- The panel opens under the figure and its controls, so it does not cover the parts. The page scrolls to it if it is out of view.
- A click on a part, or on its label, shows its panel and highlights every part with the same key. A click on empty space clears it.
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
