# Accuracy

A figure teaches. A wrong fact in a figure is worse than a missing one. Three things keep it true: a facts list, model checks, and a second check by a reviewer who did not build it.

## 1. The facts list
Put every number and claim that the reader can see into `F.facts([...])`:

```js
F.facts([
  { id: "spacing", claim: "8-speed cogs sit 4.8 mm apart.", status: "sourced", source: "Name of the page", url: "https://..." },
  { id: "ratio",   claim: "The wheel turns ring / cog times per pedal turn.", status: "model" },
  { id: "pulley",  claim: "Both pulleys have 11 teeth.", status: "assumed", source: "Typical value." },
  { id: "frame",   claim: "The frame and the chainring size.", status: "illustrative" },
]);
```

Status:
- `sourced`: you opened the source in this session and it says this. It needs a `url`. Prefer the maker, the standard, or a reference site over a blog.
- `model`: it follows from other facts by arithmetic or geometry that the scene computes.
- `assumed`: a typical value that you did not look up. Say so.
- `illustrative`: made up so that there is something to show. Say so.

Rules:
- A number from memory is `assumed`, not `sourced`.
- A `fact` line in `F.describe` must carry `src`. `src` is one fact id or a list, and it covers the `what`, `does` and `how` lines too. The part panel shows the status of each source to the reader.
- Part roles (what a part does) are general knowledge. Keep them plain and uncontroversial. If a role contains a number or a strong claim ("breaks first in a crash"), make it a fact with a source or cut it.
- The card shows a Sources button when the list is not empty. The caption states what is illustrative.

## 2. Model checks
`F.check(name, ok, detail)` runs when the scene is built. Failures show in the audit. Write checks that would catch a wrong model:
- A length that must stay constant (a chain, a cable, a rod).
- A clearance (two parts never overlap in any state).
- An alignment (the guide pulley is under the selected cog).
- An order (each question gets a reply, steps run in the standard's order).
- A ratio (output turns per input turn equals the tooth ratio).

Loop the checks over every state (every gear, every step), not one.

## 3. The second check
The builder does not grade its own facts. After the capture, `shots/audit.json` holds the facts list and the part descriptions. Hand that file, and nothing else, to a reviewer with fresh context (a subagent if you have one, otherwise do it as a separate pass after the build). The reviewer:
1. Opens the `url` of each `sourced` fact and finds the sentence that supports the claim. Marks it confirmed, wrong, or not found.
2. Reads each `assumed` fact and each part role, and flags any that is doubtful or that states more than it can support.
3. Reads the caption and the lesson text for claims that are not in the facts list.

Fix every `wrong` and `not found`. Either find a source, change the status, or cut the claim. Report the result in one line: "Facts: 5 confirmed, 1 changed to assumed, 0 open."

## Limits
This lowers the error rate and makes every claim traceable. It does not prove truth. A source can be wrong, and a reviewer can misread it. Say what was checked and what was not.
