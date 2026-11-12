# Examples

Each one is a worked figure in `examples/`. The gallery in the [README](README.md) shows four of them.

## `examples/f1-power-unit`

The 2026 Formula 1 power unit in a generic single seater that drives. The road scrolls and the wheels roll from one speed slider, and everything keeps running as you step in. Three stages: the car, the power unit, inside the V6. The readout works out fuel energy flow, engine power, electric power and the electric share from the regulation formulas. Split crank pins give the even 120 degree firing interval. It carries 30 facts, 22 of them sourced, and 20 model checks.

[Open the figure](https://auswallace.github.io/mech/examples/f1-power-unit/)

## `examples/eye`

How the human eye focuses near and far. Three stages: the whole eye looking at a flower, the eye cut open with the rays traced through it, and a distance slider that moves the flower. The lens bulges to keep the rays on the retina, and a small panel shows what the retina gets, sharp or blurry. The rays come from a paraxial trace through the Le Grand schematic eye, down to a 10 cm near point. It carries 15 facts, 11 of them sourced, and 14 model checks.

[Open the figure](https://auswallace.github.io/mech/examples/eye/)

## `examples/gps`

How GPS finds where you are while you drive. A car drives a loop road on a curved Earth under four satellites. Three stages: the car, the four signals with the distance each one gives, and the four distances drawn as rings on the ground that cross at the car. A trail of fixes follows the car round the loop. The readout comes from a model with satellites 20,200 km up and a receiver that solves its position and clock error from four distances. It carries 13 facts, 9 of them sourced, and 7 model checks.

[Open the figure](https://auswallace.github.io/mech/examples/gps/)

## `examples/undersea-cable`

How a message crosses the ocean. Three stages: a globe with a cable from New York to London and a pulse of light on it, the cable on the sea floor with a repeater, and the cable cut open layer by layer next to a coin for scale. The cable is about 25 mm across, and the glass fibres in the middle are about as thin as a hair. The readout works out the crossing time from the distance and the speed of light in glass. The layer order is sourced, and the thickness of each layer is marked illustrative. It carries 20 facts, 15 of them sourced, and 9 model checks.

[Open the figure](https://auswallace.github.io/mech/examples/undersea-cable/)

## `examples/derailleur`

How a rear derailleur shifts gears. Toothed cogs, a chain that follows a solved path, a parallelogram that swings, and a cage whose angle keeps the chain length constant. It carries a sourced facts list and 33 model checks.

[Open the figure](https://auswallace.github.io/mech/examples/derailleur/)

## `examples/gocator`

How a laser line profiler turns a laser line into heights, with the Gocator 2630 as the reference model. Eight stages from the sensor on a conveyor to the parts apart and back together, a height slider that moves the line on the image chip, the spec sheet terms drawn at full size, and a scan that builds up profile by profile. Two lessons: one measurement from laser to result, and a build with one step for each component. The data sheet numbers are sourced. The housing is generic, and the internal layout is marked illustrative.

[Open the figure](https://auswallace.github.io/mech/examples/gocator/)

## `examples/dns`

How DNS finds the address of a website. Five stations, eight readable messages, a cache that fills and expires.

[Open the figure](https://auswallace.github.io/mech/examples/dns/)

## `examples/submarine`

How a submarine finds a target, and what is inside a torpedo. Three stages: the whole boat, the bow opened up for the sonar, and a torpedo leaving its tube. The sphere array sends one pulse, and the readout gives the range from the echo time. The torpedo is split into its sections, with the guide wire paying out behind it. The speed of sound in seawater, how active and passive sonar work, and the torpedo's size, propulsion and guidance are sourced. The hull, the depth and the layout inside are generic and marked illustrative. Warhead size, explosive type and fuzing are left out on purpose.

[Open the figure](https://auswallace.github.io/mech/examples/submarine/)

## `examples/llm`

The inside of a small language model. Tokens, embeddings, 12 layers of attention and MLP, and the next-token output, with the sizes of GPT-2 small.

[Open the figure](https://auswallace.github.io/mech/examples/llm/)

## `examples/v8-suv`

A twin-turbo V8 in a performance SUV. Six stages from the whole car to the pistons and valves, a lesson on the four strokes, air and exhaust flow, and a quiz. The engine follows the published layout of a 4.0 litre, 90 degree, twin-turbo V8. The body is an original, generic shell.

[Open the figure](https://auswallace.github.io/mech/examples/v8-suv/)

## `examples/tower`

The structure of a 20-storey office tower. Slabs, beams, columns, core, lifts and piled foundation, a slider that builds it storey by storey, and the paths of weight and wind.

[Open the figure](https://auswallace.github.io/mech/examples/tower/)

## `examples/integrator`

A ball-and-disc integrator, the part that mechanical computers used to do calculus. The disc is time, the ball position is a speed, and the turn of the roller is the distance. Six stages: the machine, the contact, centre and edge, a trip with a live plot of speed and distance, the same sum in brass, in a capacitor and in code, and two integrators in a loop that draw a sine. Checks prove rolling without slip and that the roller follows the area under the curve.

[Open the figure](https://auswallace.github.io/mech/examples/integrator/)
