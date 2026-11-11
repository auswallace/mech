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
