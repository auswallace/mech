# Lessons

One line per mistake found in review. Read this before you build. Add to it when a review finds something that could happen again.

- A closed shell hides everything inside it, including wheels behind a body side. Cut openings or ghost the shell.
- A solid cylinder used as a wheel well covers the wheel with its end cap. Use an open ring.
- Dots that flow inside an opaque pipe are invisible. Ghost the pipe when flow is on.
- An idle tour that starts at time zero changes the stage during the first screenshot. Start the idle clock when the figure is created, and turn the tour off in captures.
- Transitions are eased, so a screenshot taken right after a stage change shows the previous stage. Snap in captures.
- Studio lighting that is too strong turns black rubber grey and dark paint pastel. Check tyres and paint first when you tune light.
- Repeating the start point of an arc in a profile makes zero-area triangles and stray edge lines.
- A camera focus computed from a group that is still exploded frames the wrong box. Focus on fixed boxes for stages.
- A pattern in the build script that looks for `title:` matches lesson step titles first. Anchor it to the card.
- Tall figures get cut by a fixed-ratio contact sheet. Check the full image for the stage that looks cropped.
- Per-storey parts that should stop at the built height (pipes, shafts) need to scale with the build control.
- A theme read once at the top of the scene can't change later. Read it inside `start()`.
- A mechanism shown without the thing it belongs to is not recognisable. Show the surroundings in stage 1 (a derailleur needs the wheel, chain and cranks).
- Check which way the real thing hangs before you place it. A derailleur hangs down from the axle. It does not stick out sideways.
- A stack of lathe rings does not read as cogs, and loose boxes do not read as a chain. Use `F.gear`, `mech.wrapPath` and `F.chain`.
- Cogs on one hub turn at one speed. Parts that are fixed together go in one group.
- Do not slide a part where the real one swings. Pose links and cages from the model, and solve sprung parts from a constraint (constant chain length).
- A lesson step that says "the cage swings" needs the cage to swing on screen. Check every lesson image against its text.
- A label anchored at the centre of a part often points at a spot that another part covers. Read `hiddenLabels` and move the anchor.
- Many copies of one part inflate the part count. Count distinct parts.
- A number from memory can be the wrong standard (3.95 mm is 10-speed cog spacing, 8-speed is 4.8 mm). Look it up and record the source.
- A packet in flight touches nothing, so the floating check skips the `packet` and `flow` tags. Tag moving messages that way.
