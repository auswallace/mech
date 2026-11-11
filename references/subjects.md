# Subject types

Pick one type. Use its stage pattern as the starting storyboard, then cut or rename stages to fit.

## Machine
Things with moving parts: engines, pumps, locks, watches, printers.
- **Stages:** whole object, cover open, see-through, mechanism, apart, inside.
- **Model:** the kinematics. Positions come from one input (crank angle, time, a control).
- **Motion:** the mechanism runs all the time. A control changes speed or load.
- **Lesson:** one cycle, one step at a time, on one unit (one cylinder, one tooth, one valve).
- **Flow:** what goes in and what comes out (air, fuel, water, current).
- **Example:** `examples/v8-suv`.

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

## Process (not built yet)
Things that happen in steps: a supply chain, a chemical plant, a build pipeline. Stages: input, each step, output. Flow is the main feature.
