# Subject types

Pick one type. Use its stage pattern as the starting storyboard, then cut or rename stages to fit.

## Machine
Things with moving parts: engines, pumps, locks, watches, printers.
- **Stages:** whole object, cover open, see-through, mechanism, apart, inside.
- **Model:** the kinematics. Positions come from one input (crank angle, time, a control).
- **Motion:** the mechanism runs all the time. A control changes speed or load.
- **Lesson:** one cycle, one step at a time, on one unit (one cylinder, one tooth, one valve).
- **Flow:** what goes in and what comes out (air, fuel, water, current).
- **In motion (add-on):** for a machine that travels, stage 1 shows it at work: a road that scrolls and wheels that roll, from one speed in the model. It keeps running in every stage. See `examples/f1-power-unit`.
- **Examples:** `examples/v8-suv` (large), `examples/derailleur` (small, with real linkage and chain kinematics), `examples/f1-power-unit` (in motion, with readouts worked out from regulation formulas).

## Structure
Things that stand: buildings, bridges, towers, hulls, furniture.
- **Stages:** whole object, see-through, frame, core or key member, foundation or supports.
- **Model:** counts and sizes (storeys, spans, grid). A build control adds parts in the order they are built.
- **Motion:** little. Use flow dots for load paths: weight goes down, wind goes sideways and then down.
- **Lesson:** follow one load from where it starts to the ground.
- **Example:** `examples/tower`.

## Abstract system
Things with no physical shape: language models, networks, algorithms, protocols, organisations.
- **First decision:** a layout where position means something. One axis for order or time, one for depth or layer. State both in the caption.
- **Stages:** whole system, input, one unit up close, the key interaction, output.
- **Model:** real sizes of a named, published system (layer count, widths). Mark made-up values as illustrative.
- **Motion:** one item travels through the system. Hold it at a step for each stage.
- **Lesson:** follow that one item from input to output.
- **Example:** `examples/llm`.

## Conversation
Parties that exchange messages: DNS, TLS, logins, payment flows, any protocol or handshake.
- **Layout:** each party is a station at a fixed place. Near the reader is "your side", far is "the other side". Put a hierarchy on steps.
- **Messages are packets you can read.** One packet travels from station to station. A boxed, pinned label on it shows what it says in plain words. One colour for questions, one for replies.
- **State is visible.** What a party knows or holds is an object at its station (a cache entry, a key, a certificate). It appears at the step where the party gets it.
- **Stages:** the whole exchange on a loop, then one stage per key message with the packet held on that hop.
- **Model:** an ordered list of messages `{ from, to, kind, say, note }`. The animation, the lesson and the hints all read from that list.
- **Checks:** every question gets a reply from the party that was asked, the order matches the standard, and the short path (cached, resumed) skips the right steps.
- **Lesson:** one step per message, in order, then the "second time" or "what if" case.
- **Example:** `examples/dns`.

## Process (not built yet)
Things that happen in steps: a supply chain, a chemical plant, a build pipeline. Stages: input, each step, output. Flow is the main feature.
