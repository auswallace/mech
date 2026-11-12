/* A ball-and-disc integrator: a machine that does calculus with shape. Units: millimetres. x runs along the carriage travel, z is up.
   The common case: the input is a speed, the disc is the clock, and the roller counts the distance.
   Sourced: the mechanism (disc, ball on a carriage, output roller parallel to the carriage), who described it, where it was used,
   and the low output torque that needed a torque amplifier. Model: every ratio and every curve.
   Illustrative: all sizes, the flat layout with one ball, the scale (100 km/h at 50 mm), the capacitor board and the code screen. */
(function () {
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // ---------- 1. the model: every number on screen comes from here ----------
  const M = { R: 60, rb: 12, rc: 10, xMax: 50, vMax: 100, discPeriod: 60, trip: 360, speedUp: 20, codeStep: 6, loopA0: 42, loopPeriod: 120 };
  M.x = (v) => v / M.vMax * M.xMax;                        // carriage position for a speed
  M.omegaD = TAU / M.discPeriod;                           // disc speed, rad per second of trip time. The disc is the clock.
  M.surf = (x) => M.omegaD * x;                            // speed of the disc surface under the ball
  M.ballRate = (x) => M.surf(x) / M.rb;                    // the ball rolls on the disc without slip
  M.rollerRate = (x) => M.ballRate(x) * M.rb / M.rc;       // the roller rolls on the ball without slip
  M.kmPerTurn = (M.vMax * M.discPeriod / 3600) / (M.xMax / M.rc);   // distance for one turn of the roller
  M.km = (theta) => theta / TAU * M.kmPerTurn;
  M.nodes = [[0, 0], [30, 50], [120, 50], [150, 100], [270, 100], [330, 0], [360, 0]];     // the demo trip: time in s, speed in km/h
  M.profile = (t) => { const n = M.nodes; for (let i = 1; i < n.length; i++) if (t <= n[i][0]) return n[i - 1][1] + (n[i][1] - n[i - 1][1]) * (t - n[i - 1][0]) / (n[i][0] - n[i - 1][0]); return 0; };
  M.exact = (t) => { let a = 0; const n = M.nodes; for (let i = 1; i < n.length; i++) { const t0 = n[i - 1][0], t1 = Math.min(t, n[i][0]); if (t1 <= t0) break; a += (n[i - 1][1] + M.profile(t1)) / 2 * (t1 - t0) / 3600; } return a; };   // area under the speed curve, in km
  M.fresh = () => ({ t: 0, thD: 0, thR: 0, ball: 0, volt: 0, code: 0, codeT: 0, hist: [] });
  // one step of the machine. The roller angle grows by (disc angle) x (ball position) / (roller radius). That is the whole trick.
  M.step = (s, v, dt) => { const x = M.x(v); s.t += dt; s.thD += M.omegaD * dt; s.ball += M.ballRate(x) * dt; s.thR += M.rollerRate(x) * dt; s.volt += v / 3600 * dt; while (s.t - s.codeT >= M.codeStep) { s.codeT += M.codeStep; s.code += v * M.codeStep / 3600; } };
  // two integrators in a loop. Roller A sets carriage B. Roller B sets carriage A, with the sign turned round.
  M.c = (TAU / M.loopPeriod) * M.rc / M.omegaD;            // carriage travel for each radian of the other roller
  M.loopFresh = () => ({ t: 0, thD: 0, thA: 0, thB: 0, xA: M.loopA0, xB: 0, ballA: 0, ballB: 0, hist: [] });
  M.loopStep = (s, dt) => { s.t += dt; s.thD += M.omegaD * dt; s.thA += M.rollerRate(s.xA) * dt; s.ballA += M.ballRate(s.xA) * dt; s.xB = M.c * s.thA; s.thB += M.rollerRate(s.xB) * dt; s.ballB += M.ballRate(s.xB) * dt; s.xA = M.loopA0 - M.c * s.thB; };
  const state = { stage: 0, labels: true, style: location.hash === "#line" ? "line" : "real", v: 60, mode: "manual", inset: null, hold: 0, run: M.fresh(), loop: M.loopFresh() };
  let F = null;

  function start() {
    if (F) F.dispose();
    F = new mech.Figure("#fig", { theme: document.documentElement.dataset.theme || "dark", style: state.style, width: 760, height: 480, azimuth: 34, elevation: 28 });
    const REAL = state.style === "real", DARK = F.theme === "dark", WARM = 0xff8a2a, f1 = (v) => v.toFixed(1), f2 = (v) => v.toFixed(2);
    const bx = (x0, x1, y0, y1, z0, z1, o) => F.box({ w: x1 - x0, d: y1 - y0, h: z1 - z0, r: o.r || 0 }, Object.assign({ at: [(x0 + x1) / 2, (y0 + y1) / 2, z0] }, o));

    // ---------- 2. facts ----------
    const BD = "https://en.wikipedia.org/wiki/Ball-and-disk_integrator", DA = "https://en.wikipedia.org/wiki/Differential_analyser";
    F.facts([
      { id: "mech", claim: "A disc turns at a constant rate. A carriage moves a ball along a radius of the disc. The ball passes its motion to an output shaft that is parallel to the carriage. The output is faster when the ball is farther from the centre, it stops at the centre, and it reverses on the other side.", status: "sourced", source: "Wikipedia, Ball-and-disk integrator", url: BD },
      { id: "who", claim: "James Thomson first described the idea. His brother William, Lord Kelvin, used it in his Harmonic Analyser of 1886 for tides.", status: "sourced", source: "Wikipedia, Ball-and-disk integrator", url: BD },
      { id: "uses", claim: "Later uses: naval fire-control computers such as the Dreyer table and the US Navy Rangekeeper, the Norden bombsight, and missile guidance into the mid-1970s.", status: "sourced", source: "Wikipedia, Ball-and-disk integrator", url: BD },
      { id: "speed", claim: "In one guidance system the disc was time, the ball speed was the speed of the missile, and the count of rotations was the distance.", status: "sourced", source: "Wikipedia, Ball-and-disk integrator", url: BD },
      { id: "torque", claim: "The output torque of the integrator is low. Thomson could not drive the next stage with it. The torque amplifier of Vannevar Bush solved that for the differential analysers of the 1930s.", status: "sourced", source: "Wikipedia, Ball-and-disk integrator", url: BD },
      { id: "da", claim: "A differential analyser solves differential equations with integrators, where the output of one integrator drives the input of the next. James Thomson and Lord Kelvin published the idea in 1876. Vannevar Bush called his machine a differential analyzer in 1931.", status: "sourced", source: "Wikipedia, Differential analyser", url: DA },
      { id: "ratio", claim: "With no slip, the roller turns (ball position / roller radius) times for each turn of the disc. At " + M.xMax + " mm that is " + M.xMax / M.rc + " turns.", status: "model" },
      { id: "km", claim: "One turn of the roller is " + f2(M.kmPerTurn) + " km in this figure. So the dial shows the area under the speed curve.", status: "model" },
      { id: "tripkm", claim: "The demo trip covers exactly " + f2(M.exact(M.trip)) + " km. This is the area under its speed curve.", status: "model" },
      { id: "sine", claim: "Two integrators in a loop solve the equation of a swing: the second input is the first output, and the first input is the second output with the sign turned round. The carriages then move as a cosine and a sine.", status: "model" },
      { id: "analog", claim: "A capacitor adds up the current that flows into it. Its voltage is the sum. An amplifier circuit uses this to integrate a signal.", status: "assumed", source: "Standard electronics. Not looked up for this figure." },
      { id: "sizes", claim: "All sizes, the flat layout with one ball, the scale of 100 km/h at 50 mm, the speed-up of time, the capacitor board and the code screen.", status: "illustrative" },
    ]);

    // ---------- 3. checks ----------
    { let slip = 0; for (let x = -M.xMax; x <= M.xMax; x += 5) slip = Math.max(slip, Math.abs(M.ballRate(x) * M.rb - M.surf(x)), Math.abs(M.rollerRate(x) * M.rc - M.ballRate(x) * M.rb));
      F.check("no slip: disc, ball and roller have the same surface speed at each contact", slip < 1e-12); }
    F.check("the roller stops when the ball is at the centre", M.rollerRate(0) === 0);
    F.check("the roller reverses on the other side of the centre", M.rollerRate(-20) === -M.rollerRate(20));
    F.check("roller turns for each disc turn = ball position / roller radius", Math.abs(M.rollerRate(M.xMax) / M.omegaD - M.xMax / M.rc) < 1e-12, M.xMax / M.rc + " turns at " + M.xMax + " mm");
    { const s = M.fresh(); for (let i = 0; i < 180 * 3; i++) M.step(s, 100, 1 / 3); F.check("constant speed: 100 km/h for 3 minutes reads 5 km on the roller", Math.abs(M.km(s.thR) - 5) < 1e-9, f2(M.km(s.thR)) + " km"); }
    { const s = M.fresh(), dt = M.speedUp / 30; let worst = 0; while (s.t < M.trip) { M.step(s, M.profile(s.t + dt / 2), dt); worst = Math.max(worst, Math.abs(M.km(s.thR) - M.exact(Math.min(s.t, M.trip)))); }
      F.check("the roller reading follows the area under the speed curve through the whole trip", worst < 0.02, "worst gap " + (worst * 1000).toFixed(0) + " m of " + f2(M.exact(M.trip)) + " km");
      F.check("brass, capacitor and code agree at the end of the trip", Math.abs(s.volt - M.km(s.thR)) < 0.01 && Math.abs(s.code - M.km(s.thR)) / M.km(s.thR) < 0.02, f2(M.km(s.thR)) + " km, " + f2(s.volt) + " V, " + f2(s.code) + " km"); }
    F.check("the ball stays on the disc", M.xMax + 4 < M.R);
    F.check("the ball touches the disc and the roller", Math.abs((40 + 2 * M.rb) - (74 - M.rc)) < 1e-9);
    { const s = M.loopFresh(), dt = M.speedUp / 30, W = TAU / M.loopPeriod; let worst = 0, r2 = 0; while (s.t < 5 * M.loopPeriod) { M.loopStep(s, dt); worst = Math.max(worst, Math.abs(s.xA - M.loopA0 * Math.cos(W * s.t)), Math.abs(s.xB - M.loopA0 * Math.sin(W * s.t))); r2 = Math.max(r2, Math.abs(Math.hypot(s.xA, s.xB) - M.loopA0)); }
      F.check("the loop draws a cosine and a sine for 5 full swings", worst < 2.5, "worst gap " + f2(worst) + " mm of " + M.loopA0 + " mm");
      F.check("the loop keeps its size: it does not grow or die out", r2 < 1.5, f2(r2) + " mm"); }

    // ---------- 4. parts ----------
    // One integrator. y0: where it stands. side: which side the lead screw is on. tag: so a second one can be hidden.
    function unit(y0, side, tag, K) {
      const o = (info, x) => Object.assign({ tag, info: K + info }, x), ys = y0 + side * 40, U = {};
      bx(-112, 112, y0 - 64, y0 + 64, 0, 8, o("base", { mat: "darkSteel", r: 5 }));
      bx(-16, 16, y0 - 16, y0 + 16, 8, 26, o("drive", { mat: "castAl", r: 3 })); F.cyl({ r: 6, h: 8, n: 20 }, o("drive", { mat: "steel", at: [0, y0, 26] }));
      U.disc = F.group({ at: [0, y0, 34], info: K + "disc" });
      F.lathe([[0, 0], [58, 0], [60, 1.5], [60, 4.5], [58, 6], [0, 6]], { n: 64 }, { mat: "brass", tag, group: U.disc }); bx(6, 57, -1, 1, 6, 6.5, { mat: "plastic", tag, group: U.disc, edges: false, shadow: false }); F.cyl({ r: 3, h: 0.6, n: 16 }, { mat: "plastic", tag, group: U.disc, at: [0, 0, 6], edges: false, shadow: false });
      // carriage: the ball in its cage, an arm, and a nut on the lead screw
      U.car = F.group({ at: [0, y0, 0], info: K + "carriage" });
      U.ball = F.group({ group: U.car, at: [0, 0, 40 + M.rb], info: K + "ball" });
      F.add(new THREE.SphereGeometry(M.rb, 32, 20), { mat: "chrome", tag, group: U.ball, edges: false }); F.torus({ R: M.rb + 0.15, r: 0.7, axis: "y", n: 40 }, { mat: "plastic", tag, group: U.ball, shadow: false });
      U.cage = [bx(-16, 16, 14, 17, 43, 62, { mat: "castAl", tag, group: U.car }), bx(-16, 16, -17, -14, 43, 62, { mat: "castAl", tag, group: U.car }), bx(-16, -13, -14, 14, 43, 50, { mat: "castAl", tag, group: U.car }), bx(13, 16, -14, 14, 43, 50, { mat: "castAl", tag, group: U.car })];
      bx(-6, 6, Math.min(side * 17, side * 33), Math.max(side * 17, side * 33), 46, 54, { mat: "castAl", tag, group: U.car }); bx(-9, 9, side * 40 - 7, side * 40 + 7, 43, 57, { mat: "brass", tag, group: U.car });
      bx(-0.8, 0.8, Math.min(side * 47, side * 53), Math.max(side * 47, side * 53), 43, 44, { tone: "hi", lit: true, tag, group: U.car, edges: false, shadow: false });
      // lead screw with its knob, and the scale
      F.cyl({ r: 3, h: 216, n: 14, axis: "x" }, o("screw", { mat: "steel", at: [-108, ys, 50] })); for (const s of [-1, 1]) bx(s * 91 - 3, s * 91 + 3, ys - 7, ys + 7, 8, 58, o("screw", { mat: "castAl" }));
      F.cyl({ r: 10, h: 8, n: 28, axis: "x" }, o("knob", { mat: "plastic", at: [-116, ys, 50] }));
      bx(-56, 56, ys + side * 13 - 4, ys + side * 13 + 4, 8, 9, o("scale", { mat: "castAl" })); for (const x of [-50, -25, 0, 25, 50]) bx(x - 0.7, x + 0.7, ys + side * 13 - 4, ys + side * 13 + 4, 9, 9.5, o("scale", { tone: "hi", lit: true, edges: false, shadow: false }));
      // output roller on two posts, with a dial on its shaft
      U.roller = F.group({ at: [0, y0, 74], info: K + "roller" });
      F.cyl({ r: M.rc, h: 140, n: 40, axis: "x" }, { mat: "brass", tag, group: U.roller, at: [-70, 0, 0] }); bx(-68, 68, -0.9, 0.9, M.rc - 0.2, M.rc + 0.4, { mat: "plastic", tag, group: U.roller, edges: false, shadow: false });
      F.cyl({ r: 3, h: 216, n: 14, axis: "x" }, { mat: "steel", tag, group: U.roller, at: [-108, 0, 0] });
      F.cyl({ r: 16, h: 3, n: 40, axis: "x" }, { mat: "castAl", tag, group: U.roller, at: [104, 0, 0], info: K + "dial" }); bx(107, 107.5, -1, 1, 3, 15, { tone: "hi", lit: true, tag, group: U.roller, edges: false, shadow: false, info: K + "dial" });
      for (const s of [-1, 1]) bx(s * 81 - 3, s * 81 + 3, y0 - 9, y0 + 9, 8, 86, o("post", { mat: "castAl" }));
      return U;
    }
    const A = unit(0, -1, "u", ""), YB = -175, B = unit(YB, 1, "u2", "b_");
    // the loop: two belts. The second one is crossed, and that turns the sign round.
    const belt = (x, p, q, cross) => { const pts = cross ? [[x - 1.5, p[0], p[1] + 8], [x - 1.5, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2], [x - 1.5, q[0], q[1] - 8], [x, q[0] - 8, q[1]], [x + 1.5, q[0], q[1] + 8], [x + 1.5, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2], [x + 1.5, p[0], p[1] - 8], [x, p[0] + 8, p[1]]] : [[x, p[0], p[1] + 8], [x, q[0], q[1] + 8], [x, q[0] - 8, q[1]], [x, q[0], q[1] - 8], [x, p[0], p[1] - 8], [x, p[0] + 8, p[1]]];
      F.tube(pts, 1.3, { mat: "rubber", tag: "loop", info: "belt", closed: true }); for (const c of [p, q]) F.cyl({ r: 7, h: 6, n: 24, axis: "x" }, { mat: "steel", tag: "loop", info: "belt", at: [x - 3, c[0], c[1]] }); };
    belt(100, [0, 74], [YB + 40, 50], false); belt(-100, [YB, 74], [-40, 50], true);
    // the same sum in electricity: a small board with a capacitor and a voltage bar
    const e = (info, x) => Object.assign({ tag: "elec", info }, x), EY = -125;
    for (const [x, y] of [[-92, EY - 22], [-28, EY - 22], [-92, EY + 22], [-28, EY + 22]]) F.cyl({ r: 2, h: 6, n: 10 }, e("board", { mat: "steel", at: [x, y, 0], edges: false }));
    bx(-96, -24, EY - 26, EY + 26, 6, 8, e("board", { color: 0x1d5136 })); bx(-88, -72, EY - 8, EY + 8, 8, 12, e("opamp", { mat: "plastic" })); F.cyl({ r: 2, h: 14, n: 10, axis: "x" }, e("board", { mat: "brass", at: [-67, EY - 14, 10.5], edges: false }));
    F.cyl({ r: 9, h: 24, n: 28 }, e("cap", { mat: "plastic", at: [-52, EY + 4, 8] })); F.cyl({ r: 9.05, h: 3, n: 28 }, e("cap", { mat: "castAl", at: [-52, EY + 4, 29], edges: false }));
    bx(-36, -30, EY - 3, EY + 3, 8, 50, e("volt", { mat: "glass" })); const vbar = bx(-35, -31, EY - 4.2, EY - 3, 8, 9, e("volt", { color: WARM, edges: false, shadow: false })); vbar.material.emissive.setHex(WARM);
    // the same sum in code: a small screen
    const c2 = (x) => Object.assign({ tag: "code", info: "code" }, x), CY = -125;
    bx(28, 96, CY - 14, CY + 14, 0, 5, c2({ mat: "plastic", r: 3 })); bx(30, 94, CY - 3, CY + 1, 5, 50, c2({ mat: "plastic", r: 1 })); bx(33, 91, CY - 3.6, CY - 3, 9, 46, c2({ mat: "glass", edges: false }));

    // ---------- 5. what each part is ----------
    const D = {
      disc: { name: "Disc", what: "A flat brass disc that turns at a constant rate.", does: "It is the clock of the machine. One turn is one minute of the trip.", how: "A point on the disc moves faster when it is farther from the centre. That one fact does the multiplication.", src: ["mech"] },
      ball: { name: "Ball", what: "A steel ball that rests on the disc and touches the roller.", does: "It carries motion from the disc to the roller.", how: "It rolls without slip. At the centre of the disc it does not turn. Farther out it turns faster. Past the centre it turns the other way.", src: ["mech"] },
      roller: { name: "Output roller", what: "A brass cylinder above the ball, parallel to the carriage travel.", does: "It adds up. Its total turn is the answer.", how: "Its speed at each instant is the input. So the angle it has turned is the sum of the input over time: the integral.", fact: "Roller turns for each disc turn = ball position / roller radius.", src: ["mech", "ratio"] },
      carriage: { name: "Carriage", what: "A cage that holds the ball, on a nut that rides the lead screw.", does: "It sets the input: how far the ball is from the centre of the disc.", how: "Here the position means speed. 50 mm from the centre is 100 km/h.", src: ["mech", "sizes"] },
      screw: { name: "Lead screw", what: "A threaded rod.", does: "It moves the carriage when it turns.", src: ["sizes"] },
      knob: { name: "Input knob", what: "The knob on the lead screw.", does: "You turn it to set the input. The Speed slider does the same.", src: ["sizes"] },
      scale: { name: "Scale", what: "A strip with five marks under the carriage.", does: "It shows the input. The middle mark is zero.", src: ["sizes"] },
      drive: { name: "Constant-speed drive", what: "A motor that is held at one speed.", does: "It turns the disc at a constant rate, so the disc angle stands for time.", src: ["mech"] },
      dial: { name: "Dial", what: "A wheel with one mark on the end of the roller shaft.", does: "It shows how far the roller has turned.", fact: "One turn is " + f2(M.kmPerTurn) + " km in this figure.", src: ["km"] },
      post: { name: "Bearing posts", what: "Two posts with bearings.", does: "They hold the roller shaft above the ball.", src: ["sizes"] },
      base: { name: "Base", what: "A heavy plate.", does: "It holds every part in line.", src: ["sizes"] },
      belt: { name: "Belts", what: "Two belts between the two machines.", does: "Each belt lets the roller of one machine turn the lead screw of the other.", how: "One belt is crossed. A crossed belt reverses the turn, and that is the minus sign in the equation. A real machine needs a torque amplifier here.", src: ["sine", "torque"] },
      board: { name: "Circuit board", what: "A small electronic integrator.", does: "It does the same sum as the brass machine, with charge.", src: ["analog", "sizes"] },
      opamp: { name: "Amplifier", what: "An amplifier chip.", does: "It sends a current into the capacitor that matches the input.", src: ["analog"] },
      cap: { name: "Capacitor", what: "A part that stores electric charge.", does: "It adds up the current that flows into it.", how: "Its voltage is the sum. Here 1 volt stands for 1 km.", src: ["analog", "sizes"] },
      volt: { name: "Voltage bar", what: "A bar that shows the voltage of the capacitor.", does: "It rises as the sum grows.", src: ["sizes"] },
      code: { name: "Code", what: "A screen with one line of a program.", does: "It does the same sum in steps: distance = distance + speed x time step.", how: "It takes one step every " + M.codeStep + " seconds of the trip, so its curve is a staircase.", src: ["sizes"] },
    };
    for (const k of ["disc", "ball", "roller", "carriage", "screw", "knob", "scale", "drive", "dial", "post", "base"]) D["b_" + k] = D[k];
    F.describe(D);
    for (const k of ["disc", "ball", "roller", "carriage", "knob", "dial"]) F.label(k, { set: "whole", on: { roller: [-45, 0, 84], disc: [-50, -6, 40], carriage: [M.x(60), -40, 57], dial: [107.6, 0, 82] }[k] });
    F.label("disc", { set: "contact", on: [-40, 30, 40] }); F.label("ball", { set: "contact" }); F.label("roller", { set: "contact", on: [-45, 0, 84] }); F.label("drive", { set: "contact", on: [0, 16, 18] });
    F.label("scale", { set: "pos" }); F.label("ball", { set: "pos" }); F.label("dial", { set: "pos", on: [107.6, 0, 82] });
    F.label("roller", { set: "sum", on: [-45, 0, 84] }); F.label("dial", { set: "sum", on: [107.6, 0, 82] });
    const LB = F.label("dial", { set: "three", text: "Brass", on: [100, 0, 96], pin: true, box: true }), LC = F.label("cap", { set: "three", text: "Capacitor", on: [-52, EY, 62], pin: true, box: true }), LK = F.label("code", { set: "three", text: "Code", on: [62, CY - 4, 60], pin: true, box: true });
    F.label("belt", { set: "loop", text: "Belt", on: [100, -70, 70] }); F.label("belt", { set: "loop", text: "Crossed belt: the minus sign", on: [-100, -105, 62] });
    const LA = F.label("carriage", { set: "loop", text: "Carriage A", on: [0, 0, 98], pin: true, box: true }), LBB = F.label("b_carriage", { set: "loop", text: "Carriage B", on: [0, YB, 98], pin: true, box: true });

    // ---------- 6. the plot: input and output against time ----------
    const inset = document.createElement("canvas"), IW = 290, IH = 176, dpr = Math.min(devicePixelRatio || 1, 2); inset.width = IW * dpr; inset.height = IH * dpr;
    inset.style.cssText = "position:absolute;left:8px;top:8px;width:" + IW + "px;height:" + IH + "px;border:1px solid var(--m-rule);border-radius:8px;background:var(--m-card);pointer-events:none;display:none"; F.stage.appendChild(inset);
    const g = inset.getContext("2d"), INK = DARK ? "#e8e8e8" : "#1a1a1a", MUTED = DARK ? "#8a8a8a" : "#6b6b70", RULE = DARK ? "#2f2f2f" : "#dcdcd8", BRASS = DARK ? "#d2ae62" : "#8a6a22", COOL = DARK ? "#6f8dff" : "#3050d0", WARMC = "#ff8a2a";
    function plot(mode) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, IW, IH); g.font = "11px -apple-system,Segoe UI,sans-serif"; g.textBaseline = "middle"; g.lineJoin = "round";
      const X0 = 12, W = IW - 24, panel = (y, h, title) => { g.strokeStyle = RULE; g.lineWidth = 1; g.strokeRect(X0 + 0.5, y + 0.5, W - 1, h - 1); g.fillStyle = MUTED; g.fillText(title, X0 + 5, y + 9); };
      const line = (pts, col, wd, dash) => { if (pts.length < 2) return; g.strokeStyle = col; g.lineWidth = wd; g.setLineDash(dash || []); g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.setLineDash([]); };
      if (mode === "loop") {
        const H = state.loop.hist, T = 2 * M.loopPeriod, t1 = Math.max(T, state.loop.t), tx = (t) => X0 + (t - (t1 - T)) / T * W, y0 = 22, h = IH - 36, py = (x) => y0 + h / 2 - x / 50 * (h / 2 - 6);
        panel(y0, h, "carriage position against time"); line([[X0, py(0)], [X0 + W, py(0)]], RULE, 1);
        const vis = H.filter((p) => p[0] >= t1 - T); line(vis.map((p) => [tx(p[0]), py(p[1])]), BRASS, 2); line(vis.map((p) => [tx(p[0]), py(p[2])]), COOL, 2);
        g.fillStyle = BRASS; g.fillText("A: cosine", X0 + 4, IH - 7); g.fillStyle = COOL; g.fillText("B: sine", X0 + 74, IH - 7); g.fillStyle = MUTED; g.fillText("no sine is built in", X0 + 128, IH - 7); return;
      }
      const H = state.run.hist, tx = (t) => X0 + t / M.trip * W, neg = H.some((p) => p[1] < 0), y1 = 6, h1 = 66, y2 = 78, h2 = 78;
      const pv = (v) => (neg ? y1 + h1 / 2 - v / 100 * (h1 / 2 - 5) : y1 + h1 - 4 - v / 100 * (h1 - 20)), dMax = Math.max(7, ...H.map((p) => Math.abs(p[2]))), pd = (d) => (neg ? y2 + h2 / 2 - d / dMax * (h2 / 2 - 6) : y2 + h2 - 5 - d / dMax * (h2 - 22));
      panel(y1, h1, "input: speed (the area is the distance)"); panel(y2, h2, "output: distance from the roller");
      if (H.length > 1) { g.fillStyle = DARK ? "rgba(210,174,98,0.28)" : "rgba(138,106,34,0.22)"; g.beginPath(); g.moveTo(tx(H[0][0]), pv(0)); H.forEach((p) => g.lineTo(tx(p[0]), pv(p[1]))); g.lineTo(tx(H[H.length - 1][0]), pv(0)); g.closePath(); g.fill(); }
      line(H.map((p) => [tx(p[0]), pv(p[1])]), INK, 1.5); line(H.map((p) => [tx(p[0]), pd(p[2])]), BRASS, 2.2);
      if (mode === "three") { line(H.map((p) => [tx(p[0]), pd(p[3])]), WARMC, 1.4, [4, 3]); const st = []; H.forEach((p, i) => { if (i) st.push([tx(p[0]), pd(H[i - 1][4])]); st.push([tx(p[0]), pd(p[4])]); }); line(st, COOL, 1.4);
        g.fillStyle = BRASS; g.fillText("brass", X0 + 4, IH - 8); g.fillStyle = WARMC; g.fillText("capacitor", X0 + 44, IH - 8); g.fillStyle = COOL; g.fillText("code, in steps", X0 + 106, IH - 8); }
      else { g.fillStyle = MUTED; g.fillText("time: " + f1(state.run.t / 60) + " of 6 minutes", X0 + 4, IH - 8); }
    }

    // ---------- 7. running ----------
    const pose = (U, x, thD, ball, thR) => { U.disc.rotation.z = thD; U.car.position.x = x; U.ball.rotation.x = ball; U.roller.rotation.x = -thR; };
    const presim = (t) => { const s = (state.run = M.fresh()); while (s.t < t) { M.step(s, M.profile(s.t + 0.5), 1); s.hist.push([s.t, M.profile(s.t), M.km(s.thR), s.volt, s.code]); } };
    let cyc = 0;
    F.onFrame((dt) => {
      const still = F.snap || F.reduced, d = dt * M.speedUp, s = state.run;
      if (state.mode === "loop") {
        const L = state.loop; if (still && L.t < 1) while (L.t < 200) { M.loopStep(L, 1); L.hist.push([L.t, L.xA, L.xB]); }
        M.loopStep(L, d); L.hist.push([L.t, L.xA, L.xB]); if (L.hist.length > 1500) L.hist.shift();
        pose(A, L.xA, L.thD, L.ballA, L.thA); pose(B, L.xB, L.thD, L.ballB, L.thB);
        LA.text("A: " + (L.xA >= 0 ? "+" : "") + f1(L.xA) + " mm"); LBB.text("B: " + (L.xB >= 0 ? "+" : "") + f1(L.xB) + " mm");
        F.readout("carriage A " + f1(L.xA) + " mm · carriage B " + f1(L.xB) + " mm · distance from centre, both together: " + f1(Math.hypot(L.xA, L.xB)) + " mm (it stays " + M.loopA0 + ")");
      } else {
        if (state.hold > 0) { state.hold -= dt; if (state.hold <= 0) { state.run = M.fresh(); } }
        else {
          if (state.mode === "trip") { if (still && s.t < 1) presim(215); state.v = M.profile(state.run.t); }
          if (state.mode === "pos") { cyc += dt; state.v = still ? 100 : [0, 100, -100][Math.floor(cyc / 2.6) % 3]; }
          const r = state.run; M.step(r, state.v, d); r.hist.push([r.t, state.v, M.km(r.thR), r.volt, r.code]);
          if (r.t >= M.trip) { if (state.mode === "trip") state.hold = still ? 1e9 : 2.5; else state.run = Object.assign(M.fresh(), { thD: r.thD, ball: r.ball }); }
          if (state.mode !== "manual") syncSlider();
        }
        const r = state.run, x = M.x(state.v); pose(A, x, r.thD, r.ball, r.thR);
        vbar.scale.z = Math.max(0.2, Math.abs(r.volt) / 7 * 41);
        LB.text("Brass: " + f2(M.km(r.thR)) + " km"); LC.text("Capacitor: " + f2(r.volt) + " V"); LK.text("distance += speed x dt  =  " + f2(r.code) + " km");
        const km = M.km(r.thR), turns = r.thR / TAU;
        F.readout(state.mode === "trip" ? "speed " + Math.round(state.v) + " km/h · time " + f1(r.t / 60) + " min · roller " + f2(km) + " km · exact area " + f2(M.exact(Math.min(r.t, M.trip))) + " km"
          : "speed " + Math.round(state.v) + " km/h · ball " + f1(x) + " mm from the centre · roller turns " + f2(M.rollerRate(x) / M.omegaD) + " times for each disc turn · counted so far " + f2(km) + " km (" + f1(turns) + " turns)");
      }
      if (state.inset) plot(state.inset);
    });

    // ---------- 8. views ----------
    const box = (a, b) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b)), unitBox = box([-124, -66, 0], [112, 66, 92]);
    function show(v) {
      const gh = Object.assign({ u: 1, cage: 0.3, post: 1, u2: 0, loop: 0, elec: 0, code: 0 }, v.ghost);
      F.ghost("u", gh.u); F.ghost("u2", gh.u2); F.ghost("loop", gh.loop); F.ghost("elec", gh.elec); F.ghost("code", gh.code); F.ghost(A.cage, gh.cage); if (gh.u2) F.ghost(B.cage, gh.cage);
      if (v.mode !== state.mode || v.reset) { state.run = M.fresh(); state.loop = M.loopFresh(); state.hold = 0; cyc = 0; }
      state.mode = v.mode; if (v.v !== undefined) state.v = v.v; state.inset = v.inset || null; inset.style.display = v.inset ? "block" : "none";
      F.labels(state.labels ? v.set : null); F.focus(v.box, { azimuth: v.az, elevation: v.el, pad: v.pad || 1.05 });
      bar.querySelectorAll("[data-c]").forEach((el) => { el.hidden = !!v.noSlider; }); syncSlider(); F.run();
    }
    const STAGES = [
      { name: "The machine", set: "whole", mode: "manual", hint: "Move the Speed slider. The carriage moves the ball across the disc, and the roller turns faster or slower.", box: unitBox, az: 34, el: 28 },
      { name: "The contact", set: "contact", mode: "manual", hint: "The ball rolls on the disc and the roller rolls on the ball. Nothing slips. That is the only connection.", ghost: { cage: 0.12 }, box: box([-70, -40, 12], [70, 40, 90]), az: 152, el: 12 },
      { name: "Centre and edge", set: "pos", mode: "pos", noSlider: true, hint: "Three positions in turn. At the centre the roller stops. At the edge it is fast. On the other side it runs backward.", ghost: { cage: 0.3 }, box: unitBox, az: 20, el: 46 },
      { name: "Add it up", set: "sum", mode: "trip", noSlider: true, inset: "trip", hint: "A six minute trip. The speed changes all the time. The roller keeps the running total, and the total is the area under the speed curve.", box: box([-230, -66, 0], [112, 66, 92]), az: 34, el: 28 },
      { name: "Three materials", set: "three", mode: "trip", noSlider: true, inset: "three", hint: "The same trip, added up three ways: brass, a capacitor, and one line of code. The code works in steps, so it runs a little behind and then catches up. At the end the three answers agree. The sum does not care what it is made of.", ghost: { elec: 1, code: 1 }, box: box([-250, -160, 0], [116, 66, 92]), az: 30, el: 30 },
      { name: "Two in a loop", set: "loop", mode: "loop", noSlider: true, inset: "loop", hint: "Each roller sets the input of the other machine. Nothing in here knows what a sine is. The two carriages draw one anyway.", ghost: { u2: 1, loop: 1 }, box: box([-250, YB - 66, 0], [116, 66, 100]), az: 32, el: 34 },
    ];

    // ---------- 9. controls and lesson ----------
    const bar = document.createElement("div"); bar.className = "mech-controls";
    bar.innerHTML = STAGES.map((s, i) => `<button data-stage="${i}">${i + 1} ${s.name}</button>`).join("") + `<span class="sp"></span><span data-c="v">Speed</span><input data-c="v" data-s="v" type="range" min="-100" max="100" step="1" aria-label="Speed in kilometres per hour, minus 100 to 100">` +
      `<span class="sp"></span><button data-t="labels" aria-pressed="${state.labels}">Labels</button><button data-t="lesson">Lesson: how it adds</button><button data-t="style">${REAL ? "Line view" : "Real view"}</button>`;
    F.mount.querySelector(".mech-stage").after(bar);
    const hintEl = F.mount.querySelector(".mech-hint"), slider = bar.querySelector("input");
    function syncSlider() { slider.value = Math.round(state.v); }
    slider.addEventListener("input", () => { F.touch(); state.v = +slider.value; if (state.mode !== "manual") { state.mode = "manual"; } F.run(); });
    function setStage(i, quiet) { if (!quiet) F.touch(); state.stage = ((i % STAGES.length) + STAGES.length) % STAGES.length; const s = STAGES[state.stage]; show(s); hintEl.textContent = s.hint; bar.querySelectorAll("[data-stage]").forEach((b, k) => b.setAttribute("aria-pressed", k === state.stage)); }
    const st = (i, extra) => () => { show(Object.assign({}, STAGES[i], { noSlider: true, reset: true }, extra)); bar.querySelectorAll("[data-stage]").forEach((b) => b.setAttribute("aria-pressed", "false")); };
    const lesson = F.lesson([
      { title: "1. The disc is the clock", text: "The disc turns at a constant rate, so its angle stands for time. Look at the dark line on it. A point near the rim moves fast. A point near the centre moves slowly. The machine uses that difference.", go: st(0, { mode: "manual", v: 0, set: "whole", az: 20, el: 46 }) },
      { title: "2. Ball at the centre: nothing", text: "The ball rests on the centre of the disc. The disc turns under it, but the centre does not go anywhere. The ball does not roll, and the roller above it stays still. Speed zero adds nothing.", go: st(1, { mode: "manual", v: 0 }) },
      { title: "3. Ball near the edge: fast", text: "Now the carriage holds the ball 50 mm out. The disc surface moves fast there. It rolls the ball, and the ball rolls the roller. The roller makes " + M.xMax / M.rc + " turns for each turn of the disc.", go: st(1, { mode: "manual", v: 100 }) },
      { title: "4. The other side: backward", text: "Past the centre, the disc surface moves the other way. The ball and the roller reverse. A negative input takes away from the total. No part was added for this. It comes from the shape.", go: st(1, { mode: "manual", v: -100 }) },
      { title: "5. The roller keeps the total", text: "At each instant, the roller speed is the input. So the angle it has turned is every input added up over time. For a trip, the input is speed and the total is distance: " + f2(M.exact(M.trip)) + " km here, the area under the curve.", go: st(3) },
      { title: "6. The same sum in three materials", text: "A capacitor adds up current. A line of code adds up numbers, one step at a time. The brass roller adds up rolling. Three different things give one answer, because the answer comes from how the parts are connected, not from what they are.", go: st(4) },
      { title: "7. Two in a loop draw a sine", text: "Roller A sets carriage B. Roller B sets carriage A through a crossed belt. Each machine now adds up the other. The carriages swing as a cosine and a sine. This is how a differential analyser solved equations before electronics.", go: st(5) },
    ], { onClose: () => setStage(0, true) });
    bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F.touch(); const t = b.dataset.t;
      if (b.dataset.stage) setStage(+b.dataset.stage); else if (t === "style") { state.style = REAL ? "line" : "real"; start(); } else if (t === "labels") { state.labels = !state.labels; b.setAttribute("aria-pressed", state.labels); F.labels(state.labels ? STAGES[state.stage].set : null); } else if (t === "lesson") lesson.open(0); });
    F.stage.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= String(STAGES.length)) setStage(+e.key - 1); });
    F.onPress = () => setStage(state.stage + 1);
    F.tour(() => setStage(state.stage + 1, true));

    // ---------- 10. card ----------
    mech.card("#fig", {
      fig: "Fig 7", title: "A machine that does calculus with a ball and a disc",
      keys: [{ mark: "lit", label: "Click a part or its label to learn what it does" }, { mark: "mid", label: "Keys 1 to 6 change the view. Drag to orbit. Sources lists every claim." }],
      caption: "A ball-and-disc integrator, the heart of the mechanical computers that predicted tides and aimed naval guns. The disc is time. The ball position is the input. The turn of the roller is the sum of the input over time. Here the input is a speed, so the sum is a distance. The readout distance comes from the roller angle, and the roller angle comes from rolling without slip. Simplified: one ball on a flat disc, and every size is made up. Time runs " + M.speedUp + " times faster than the trip. A real machine has a little slip, and a real loop needs a torque amplifier between the two units. The capacitor board and the code screen stand for the same sum in other materials. They are not models of real products.",
    });
    window.fig = F; window.setStage = setStage; window.state = state; window.model = M;
    setStage(state.stage, true); F.fit(true);
  }
  addEventListener("mech-theme", start);
  start();
})();
