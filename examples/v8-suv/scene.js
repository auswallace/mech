/* Twin-turbo hot-V V8 in a performance SUV. Units: centimetres. x forward, y left, z up.
   The body is a generic shell. The engine follows the published layout of a 4.0 litre, 90 degree, twin-turbo V8:
   bore x stroke 86 x 86 mm, cylinders 1-4 on the right bank and 5-8 on the left, firing order 1-3-7-2-6-5-4-8,
   turbochargers inside the V, cylinders 2, 3, 5 and 8 switched off in four-cylinder mode. */
(function () {
  const THEME = document.documentElement.dataset.theme || "dark";
  const F = new mech.Figure("#fig", { theme: THEME, width: 760, height: 480, azimuth: 38, elevation: 24 });
  const D = Math.PI / 180;

  // ---------- the model: every number on screen comes from here ----------
  const M = {
    stroke: 8.6, bore: 8.6, rod: 15.0, spacing: 9.0,
    order: [1, 3, 7, 2, 6, 5, 4, 8],
    codOff: [2, 3, 5, 8], codMaxRpm: 3500,
    bank: [-45 * D, 45 * D],                      // right bank (cyl 1-4), left bank (cyl 5-8), from vertical
    pin: [-45 * D, 45 * D, -135 * D, 135 * D],    // cross-plane crank pins, front to rear
    idle: 800, redline: 6800, slow: 50,           // shown 50x slower than real time
  };
  M.r = M.stroke / 2;
  M.fireAt = {}; M.order.forEach((c, i) => (M.fireAt[c] = i * 90));
  M.pistonAt = (theta, i, b) => { const a = theta + M.pin[i] - M.bank[b]; return { a, s: M.r * Math.cos(a) + Math.sqrt(M.rod * M.rod - (M.r * Math.sin(a)) ** 2) }; };
  const state = { rpm: 1200, theta: 0, cod: false, stage: 0 };

  // ---------- body shell (generic) ----------
  const WB = 150, WHEEL_R = 39, ARCH = 43;
  const arch = (cx) => ({ arc: [cx, 38, ARCH, Math.PI + 0.235, -0.235, true] });
  const side = [[246, 28], [250, 46], [248, 72], [236, 88], [120, 102], [-232, 108], [-250, 86], [-248, 42], [-240, 28], arch(-WB), arch(WB)];
  for (const y of [-97, 97]) F.add(mech.profileGeo(side, 6, y), { tone: "hi", tag: "body" });
  F.box({ w: 365, d: 136, h: 70, r: 4 }, { tone: "mid", at: [-62.5, 0, 30], tag: "body" });
  F.box({ w: 208, d: 186, h: 70, r: 2 }, { tone: "mid", at: [0, 0, 30], tag: "body", edges: false });
  F.box({ w: 367, d: 188, h: 4, r: 3 }, { tone: "hi", at: [-63, 0, 100], tag: "body" });
  F.box({ w: 8, d: 188, h: 66, r: 2 }, { tone: "hi", at: [-245, 0, 36], tag: "body" });
  F.box({ w: 12, d: 188, h: 56, r: 3 }, { tone: "hi", at: [241, 0, 30], tag: "body" });
  F.box({ w: 2, d: 112, h: 36, r: 3 }, { tone: "lo", at: [247.6, 0, 44], tag: "body" });                 // grille
  for (let i = 0; i < 7; i++) F.box({ w: 0.6, d: 108, h: 1 }, { tone: "mid", at: [248.8, 0, 47 + i * 4.6], tag: "body", edges: false, shadow: false });
  for (const s of [-1, 1]) {
    F.box({ w: 2, d: 32, h: 6, r: 1 }, { lit: true, at: [247.4, s * 76, 77], tag: "body", shadow: false });   // headlights
    F.box({ w: 2, d: 26, h: 12, r: 2 }, { tone: "lo", at: [247.4, s * 77, 34], tag: "body", shadow: false }); // lower intakes
    F.box({ w: 14, d: 6, h: 7, r: 2 }, { tone: "hi", at: [104, s * 103, 104], tag: "body" });                 // mirrors
    F.box({ w: 10, d: 1.2, h: 2 }, { tone: "lo", at: [10, s * 100.4, 88], tag: "body", edges: false, shadow: false });  // door handles
    F.box({ w: 10, d: 1.2, h: 2 }, { tone: "lo", at: [-92, s * 100.4, 90], tag: "body", edges: false, shadow: false });
  }
  F.box({ w: 1.2, d: 172, h: 4, r: 1 }, { color: 0xc8372f, at: [-250.4, 0, 92], tag: "body", shadow: false, edges: false }); // tail light bar
  const glass = [[120, 102], [66, 162], [-50, 174], [-186, 147], [-234, 108]];
  F.add(mech.profileGeo(glass, 176, 0), { tone: "lo", tag: "body" });
  F.add(mech.profileGeo([[64, 163.6], [-50, 175.6], [-182, 149.4], [-180, 146.8], [-50, 172.6], [62, 160.8]], 168, 0), { tone: "hi", tag: "body" }); // roof skin
  // hood on a rear hinge
  const hood = F.group({ at: [120, 0, 102], rot: [0, 0.12, 0] });
  F.box({ w: 117, d: 187, h: 3, r: 8 }, { tone: "hi", at: [58.5, 0, -1.5], group: hood, tag: "hood" });
  F.box({ w: 70, d: 4, h: 1 }, { tone: "mid", at: [60, 44, 1.5], group: hood, tag: "hood", edges: false, shadow: false });
  F.box({ w: 70, d: 4, h: 1 }, { tone: "mid", at: [60, -44, 1.5], group: hood, tag: "hood", edges: false, shadow: false });
  F.onFrame(() => (hood.rotation.y = 0.12 - 1.05 * F.ch("hood")));

  // ---------- wheels ----------
  for (const x of [-WB, WB]) for (const s of [-1, 1]) {
    const y = s * 84;
    F.cyl({ r: WHEEL_R, h: 29, n: 40, axis: "y" }, { tone: "lo", at: [x, y - 14.5, WHEEL_R], tag: "wheel", edges: 40 });
    F.cyl({ r: 28, h: 30, n: 36, axis: "y" }, { tone: "mid", at: [x, y - 15, WHEEL_R], tag: "wheel", edges: 40 });
    F.cyl({ r: 21, h: 3, n: 30, axis: "y" }, { tone: "hi", at: [x, y + s * 9 - 1.5, WHEEL_R], tag: "wheel", edges: 40 });    // brake disc
    F.box({ w: 14, d: 5, h: 9, r: 2 }, { color: 0xc8372f, at: [x - 12, y + s * 9, WHEEL_R + 8], tag: "wheel", edges: false });   // caliper
    for (let k = 0; k < 5; k++) F.box({ w: 5, d: 1.6, h: 27, r: 1 }, { lit: true, at: [x, y + s * 15.4, WHEEL_R], rot: [0, (k * 72 + 18) * D, 0], tag: "wheel", edges: false, shadow: false });
    F.cyl({ r: 5, h: 2, n: 16, axis: "y" }, { tone: "hi", at: [x, y + s * 15.4 - 1, WHEEL_R], tag: "wheel", edges: false });
  }

  // ---------- chassis and driveline ----------
  const C = { tag: "chassis" };
  F.box({ w: 470, d: 136, h: 3, r: 4 }, { tone: "lo", at: [0, 0, 26], ...C });
  for (const x of [22, -78]) for (const s of [-1, 1]) {
    F.box({ w: 50, d: 48, h: 13, r: 5 }, { tone: "mid", at: [x, s * 38, 44], ...C });
    F.box({ w: 12, d: 48, h: 62, r: 4 }, { tone: "mid", at: [x - 27, s * 38, 52], rot: [0, -0.22, 0], ...C });
    F.box({ w: 9, d: 22, h: 14, r: 3 }, { tone: "mid", at: [x - 41, s * 38, 114], rot: [0, -0.22, 0], ...C });
  }
  F.box({ w: 62, d: 104, h: 16, r: 5 }, { tone: "mid", at: [-112, 0, 30], ...C });                                   // fuel tank
  const batt = F.box({ w: 40, d: 30, h: 14, r: 2 }, { tone: "hi", at: [-206, 32, 34], ...C });                       // 48 V battery
  F.fins(5, { x: -220, y: 32, z: 48, w: 1, d: 24, h: 1.5, gap: 7 }, C);
  F.cyl({ r: 17, h: 16, n: 32, axis: "x" }, { tone: "hi", at: [138, 0, 50], ...C });                                 // bell housing
  F.box({ w: 72, d: 30, h: 28, r: 8 }, { tone: "hi", at: [103, 0, 36], ...C });                                     // 8-speed gearbox
  for (let i = 0; i < 6; i++) F.box({ w: 1.2, d: 31, h: 29, r: 8 }, { tone: "mid", at: [76 + i * 11, 0, 35.5], edges: false, ...C });
  F.cyl({ r: 10, h: 12, n: 24, axis: "x" }, { tone: "hi", at: [56, 0, 46], ...C });                                  // centre differential
  F.cyl({ r: 3, h: 190, n: 14, axis: "x" }, { tone: "mid", at: [-134, 0, 44], ...C });                               // propshaft
  F.box({ w: 28, d: 32, h: 24, r: 8 }, { tone: "hi", at: [-150, 0, 28], ...C });                                     // rear differential
  for (const x of [-WB, WB]) F.cyl({ r: 2.6, h: 140, n: 12, axis: "y" }, { tone: "mid", at: [x, -70, 39], ...C });   // half shafts
  F.box({ w: 5, d: 124, h: 48, r: 2 }, { tone: "mid", at: [229, 0, 34], ...C });                                     // radiator pack
  for (let i = 0; i < 20; i++) F.box({ w: 0.6, d: 0.8, h: 44 }, { tone: "lo", at: [231.8, -57 + i * 6, 36], edges: false, shadow: false, ...C });
  const exhaust = [];
  for (const s of [-1, 1]) {
    exhaust.push(F.tube([[141, s * 11, 42], [118, s * 13, 34], [20, s * 14, 32], [-120, s * 15, 46], [-170, s * 44, 34], [-192, s * 55, 36]], 3.2, { tone: "mid", ...C }));
    F.cyl({ r: 10, h: 44, n: 24, axis: "x" }, { tone: "mid", at: [-236, s * 56, 38], ...C });                        // rear silencer
    const tip = F.cyl({ r: 6, h: 10, n: 24, axis: "x" }, { tone: "hi", at: [-254, s * 62, 36], ...C });              // oval tailpipe
    tip.scale.set(1, 1.7, 1);
  }

  // ---------- engine ----------
  const E = F.group({ at: [176, 0, 50] });
  const SH = { group: E, tag: "shell" };
  F.box({ w: 42, d: 21, h: 18, r: 3 }, { tone: "hi", at: [0, 0, -10], ...SH });                                      // crankcase
  F.box({ w: 38, d: 16, h: 8, r: 3 }, { tone: "mid", at: [0, 0, -18], ...SH });                                      // oil pan
  F.fins(9, { x: -16, y: 0, z: -18.6, w: 0.8, d: 14, h: 0.8, gap: 4 }, { group: E, tag: "shell", tone: "lo", edges: false });
  F.box({ w: 2.4, d: 34, h: 30, r: 6 }, { tone: "mid", at: [22, 0, -9], ...SH });                                    // front cover
  const BRIGHT = THEME === "dark" ? 0xa8a8a8 : 0x8a8985, MIDB = THEME === "dark" ? 0x7c7c7c : 0x696865;
  const cylX = (i, b) => (1.5 - i) * M.spacing + (b ? -0.9 : 0.9);
  const cyls = [];            // { n, piston, rod, fire, coil, i, b }
  const banks = [0, 1].map((b) => {
    const sgn = b ? 1 : -1;
    const B = F.group({ group: E, rot: [-M.bank[b], 0, 0] });
    const sh = { group: B, tag: "shell" };
    F.box({ w: 41, d: 11.4, h: 16.5, r: 1 }, { tone: "hi", at: [0, 0, 7], ...sh });                                  // cylinder bank
    F.box({ w: 41, d: 13, h: 7.5, r: 1.5 }, { tone: "hi", at: [0, 0, 23.5], ...sh });                                // cylinder head
    F.box({ w: 39.5, d: 12, h: 2.6, r: 2.5 }, { tone: "mid", at: [0, 0, 31], ...sh });                               // cam cover
    for (const y of [-3.4, 3.4]) F.cyl({ r: 1.7, h: 38, n: 14, axis: "x" }, { tone: "mid", at: [-19, y, 33.2], edges: false, ...sh });
    F.box({ w: 36, d: 6, h: 9, r: 2.8 }, { tone: "mid", at: [0, sgn * 10, 20.5], ...sh });                           // intake plenum, outboard
    F.screws([[-19, sgn * 5, 31], [19, sgn * 5, 31], [-19, -sgn * 5, 31], [19, -sgn * 5, 31]], 0.5, { group: B, tag: "shell" });
    for (let i = 0; i < 4; i++) {
      const n = b * 4 + i + 1, x = cylX(i, b);
      F.box({ w: 5, d: 3.4, h: 4, r: 1 }, { tone: "mid", at: [x, sgn * 7.2, 24.6], ...sh });                         // intake runner
      F.cyl({ r: 1.5, h: 2.2, n: 12 }, { tone: "lo", at: [x, 0, 33.6], ...sh });                                     // ignition coil
      const coil = F.led([x, 0, 35.8], 0.8, { group: B, color: 0xffa033, tag: "shell" });
      const piston = F.cyl({ r: M.bore / 2 - 0.15, h: 5, n: 28 }, { lit: true, at: [x, 0, 0], group: B, tag: "moving", edges: 40 });
      F.cyl({ r: M.bore / 2 - 0.05, h: 0.5, n: 28 }, { tone: "mid", at: [0, 0, 3.4], group: piston, edges: false, shadow: false });  // ring land
      const rod = F.box({ w: 1.6, d: 2.6, h: M.rod, r: 0.5 }, { color: MIDB, at: [x, 0, 0], group: B, tag: "moving" });
      const fire = F.cyl({ r: M.bore / 2 - 0.3, h: 1.2, n: 24 }, { color: 0xffa033, at: [x, 0, 22.2], group: B, tag: "fire", edges: false, shadow: false });
      fire.material.emissive.set(0xff7a1a); fire.visible = false;
      cyls.push({ n, i, b, x, piston, rod, fire, coil });
    }
    return B;
  });
  // crankshaft, cross-plane
  const crank = F.group({ group: E });
  const MV = { group: crank, tag: "moving" };
  F.cyl({ r: 3, h: 50, n: 20, axis: "x" }, { color: BRIGHT, at: [-25, 0, 0], ...MV });
  M.pin.forEach((phi, i) => {
    const x = (1.5 - i) * M.spacing, py = M.r * Math.sin(phi), pz = M.r * Math.cos(phi);
    F.cyl({ r: 2.5, h: 4.4, n: 16, axis: "x" }, { color: BRIGHT, at: [x - 2.2, py, pz], ...MV });
    for (const dx of [-3.4, 2.2]) F.cyl({ r: 7.2, h: 1.2, n: 28, axis: "x" }, { color: MIDB, at: [x + dx, -py * 0.45, -pz * 0.45], ...MV });   // webs and counterweights
  });
  F.cyl({ r: 8, h: 3, n: 30, axis: "x" }, { tone: "hi", at: [24.6, 0, 0], group: crank, tag: "aux" });               // crank pulley
  F.box({ w: 3.2, d: 2, h: 7.5 }, { lit: true, at: [26.2, 0, 0], group: crank, tag: "aux", edges: false, shadow: false });
  F.cyl({ r: 15, h: 2.4, n: 40, axis: "x" }, { color: MIDB, at: [-25.5, 0, 0], group: crank, tag: "moving" });       // flywheel
  // 48 V belt starter generator and belt
  const AUX = { group: E, tag: "aux" };
  F.cyl({ r: 6, h: 13, n: 24, axis: "x" }, { tone: "hi", at: [10, -25, -2], ...AUX });
  F.fins(4, { x: 12, y: -25, z: 4, w: 0.8, d: 6, h: 1, gap: 3 }, { group: E, tag: "aux", edges: false });
  const bsgPulley = F.cyl({ r: 3.4, h: 3, n: 18, axis: "x" }, { tone: "mid", at: [24.6, -25, -2], ...AUX });
  F.tube([[26, 0, 8.4], [26, -25, 1.6], [26, -28.6, -2], [26, -25, -5.6], [26, 0, -8.4], [26, 8.4, 0]], 0.7, { tone: "lo", closed: true, ...AUX });
  // turbochargers in the V, one per bank
  const turbos = [0, 1].map((b) => {
    const sgn = b ? 1 : -1, tx = b ? -6 : 4, ty = sgn * 6.6, tz = 28.5;
    const G = F.group({ group: E, at: [tx, ty, tz] });
    const T = { group: G, tag: "turbo" };
    F.cyl({ r: 2.6, h: 4.4, n: 16, axis: "x" }, { tone: "mid", at: [-2.2, 0, 0], ...T });                            // bearing housing
    F.cyl({ r: 5.7, h: 4, n: 30, axis: "x" }, { tone: "hi", at: [2.2, 0, 0], ...T });                                // compressor housing
    F.cyl({ r: 3.1, h: 3, n: 20, axis: "x" }, { tone: "hi", at: [6.2, 0, 0], ...T });                                // compressor inlet
    const hot = F.cyl({ r: 5.3, h: 4.6, n: 30, axis: "x" }, { tone: "mid", at: [-6.8, 0, 0], ...T });                // turbine housing
    F.cyl({ r: 1.6, h: 5, n: 12, axis: "y" }, { tone: "mid", at: [-4.5, sgn > 0 ? 0 : -5, 6], ...T, edges: false }); // wastegate actuator
    const wheel = F.group({ group: G, at: [9.3, 0, 0] });
    for (let k = 0; k < 6; k++) F.box({ w: 0.5, d: 0.7, h: 2.7 }, { lit: true, at: [0, 0, 0], rot: [k * 60 * D, 0, 0], group: wheel, tag: "turbo", edges: false, shadow: false });
    // exhaust runners from the inboard side of the head into the turbine
    const runners = [];
    for (let i = 0; i < 4; i++) {
      const x = cylX(i, b), py = sgn * 14.6, pz = 23.6;
      runners.push(F.tube([[x, py, pz], [(x + tx - 6.8) / 2, sgn * 13.4, 25.6], [tx - 4.6, sgn * 11.6, 27.2]], 1.3, { tone: "mid", group: E, tag: "pipes" }));
    }
    // downpipe to the exhaust, intake from the airbox, charge pipe to the plenum
    const down = F.tube([[tx - 6.8, ty, tz], [-22, sgn * 8, 28], [-31, sgn * 10, 12], [-35, sgn * 11, -8]], 3, { tone: "mid", group: E, tag: "pipes" });
    F.tube([[tx + 9.2, ty, tz], [26, sgn * 11, 30], [33, sgn * 22, 26], [38, sgn * 29, 22]], 2.8, { tone: "lo", group: E, tag: "pipes" });
    F.box({ w: 18, d: 18, h: 14, r: 4 }, { tone: "mid", at: [42, sgn * 32, 10], group: E, tag: "pipes" });           // air filter box
    F.tube([[tx + 4, sgn * 11.4, 31.5], [21, sgn * 15, 33], [26, sgn * 26, 27], [21, sgn * 27.5, 15.5], [17, sgn * 25.6, 13]], 2.1, { tone: "hi", group: E, tag: "pipes" });
    return { hot, wheel, runners, down };
  });

  // ---------- running ----------
  const firing = (n, cyc) => { if (state.cod && M.codOff.includes(n)) return false; const d = (((cyc - M.fireAt[n]) % 720) + 720) % 720; return d < 70; };
  F.onFrame((dt) => {
    if (state.cod && state.rpm > M.codMaxRpm) setCod(false);
    if (!F.reduced) state.theta += (state.rpm * 6 * D * dt) / M.slow;
    const th = state.theta, cyc = ((th / D) % 720 + 720) % 720;
    crank.rotation.x = -th;
    bsgPulley.rotation.x = -th * 2.35;
    for (const c of cyls) {
      const { a, s } = M.pistonAt(th, c.i, c.b);
      c.piston.position.z = s - 2.5;
      c.rod.position.set(c.x, M.r * Math.sin(a), M.r * Math.cos(a));
      c.rod.rotation.x = Math.atan2(M.r * Math.sin(a), s - M.r * Math.cos(a));
      const on = firing(c.n, cyc);
      c.fire.visible = on && state.stage === 4;
      F.setLed(c.coil, on);
    }
    const load = (state.rpm - M.idle) / (M.redline - M.idle);
    for (const t of turbos) {
      t.wheel.rotation.x -= (0.6 + load * 5) * 6 * dt;
      F.glow(t.hot, 0.08 + load * 0.75); t.runners.forEach((r) => F.glow(r, 0.05 + load * 0.6)); F.glow(t.down, load * 0.35);
    }
    const now = state.cod ? [1, 7, 6, 4] : M.order;
    const cur = M.order[Math.floor(cyc / 90) % 8];
    const live = state.cod && M.codOff.includes(cur) ? "–" : cur;
    F.readout(Math.round(state.rpm).toLocaleString("en-US") + " rpm · firing cyl " + live + " · order " + now.join("-"));
  });

  // ---------- stages ----------
  const all = (a) => F.ghost(["body", "hood", "wheel", "chassis", "shell", "aux", "turbo", "pipes", "moving"], a);
  const front = new THREE.Box3(new THREE.Vector3(96, -108, 18), new THREE.Vector3(258, 108, 176));
  const STAGES = [
    { name: "Car", hint: "A front-engined performance SUV. Drag to turn it.", go() { all(1); F.shadow(1); F.to("hood", 0); F.focus(null, { azimuth: 38, elevation: 24 }); } },
    { name: "Hood up", hint: "The V8 sits lengthwise, ahead of the front axle.", go() { all(1); F.shadow(1); F.to("hood", 1, 0.4); F.focus(front, { azimuth: 58, elevation: 36, pad: 1.12 }); } },
    { name: "See-through", hint: "Engine, 8-speed gearbox, propshaft, both axles, twin exhausts, 48 V battery at the back.", go() { all(1); F.shadow(0.5); F.ghost(["body", "hood"], 0.06); F.ghost("wheel", 0.45); F.to("hood", 0); F.focus(null, { azimuth: 30, elevation: 34 }); } },
    { name: "Engine", hint: "Two turbochargers sit inside the V. Exhaust goes in from the middle, fresh air comes in from the outside.", go() { all(1); F.shadow(0); F.ghost(["body", "hood", "wheel"], 0); F.ghost("chassis", 0.035); F.to("hood", 0); F.focus(E, { azimuth: 42, elevation: 30, pad: 0.86 }); } },
    { name: "Inside", hint: "Eight pistons on a cross-plane crank. The flash is the cylinder that fires.", go() { all(1); F.ghost(["body", "hood", "wheel", "chassis"], 0); F.shadow(0); F.ghost("shell", 0.07); F.ghost("pipes", 0.06); F.ghost("aux", 0.2); F.ghost("turbo", 0.14); F.to("hood", 0); F.focus(E, { azimuth: 24, elevation: 20, pad: 0.86 }); } },
  ];

  // ---------- controls ----------
  const bar = document.createElement("div"); bar.className = "mech-controls";
  bar.innerHTML = STAGES.map((s, i) => `<button data-stage="${i}">${i + 1} ${s.name}</button>`).join("") +
    `<span class="sp"></span><span>Throttle</span><input type="range" min="${M.idle}" max="${M.redline}" step="50" value="${state.rpm}" aria-label="Engine speed in rpm"><button data-cod aria-pressed="false">4-cylinder mode</button>`;
  F.mount.querySelector(".mech-stage").after(bar);
  const hintEl = F.mount.querySelector(".mech-hint"), codBtn = bar.querySelector("[data-cod]"), slider = bar.querySelector("input");
  function setStage(i) { state.stage = Math.max(0, Math.min(STAGES.length - 1, i)); STAGES[state.stage].go(); hintEl.textContent = STAGES[state.stage].hint; bar.querySelectorAll("[data-stage]").forEach((b, k) => b.setAttribute("aria-pressed", k === state.stage)); }
  function setCod(on) { state.cod = on && state.rpm <= M.codMaxRpm; codBtn.setAttribute("aria-pressed", state.cod); }
  bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.stage) setStage(+b.dataset.stage); else setCod(!state.cod); });
  slider.addEventListener("input", () => { state.rpm = +slider.value; codBtn.disabled = state.rpm > M.codMaxRpm; codBtn.style.opacity = codBtn.disabled ? 0.4 : 1; F.run(); });
  F.stage.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= "5") setStage(+e.key - 1); });
  F.onPress = () => setStage((state.stage + 1) % STAGES.length);

  mech.card("#fig", {
    fig: "Fig 1", title: "Twin-turbo V8 in a performance SUV",
    keys: [{ mark: "lit", label: "Pistons: what the crank moves" }, { mark: "mid", label: "Keys 1 to 5 step in. Space goes to the next step. Drag to orbit." }],
    caption: "A 4.0 litre, 90 degree V8 with an 86 mm bore and an 86 mm stroke. Cylinders 1 to 4 are on the right bank and 5 to 8 on the left, and they fire in the order 1-3-7-2-6-5-4-8. Both turbochargers sit inside the V, so the exhaust path from each head to its turbine is short. In 4-cylinder mode, cylinders 2, 3, 5 and 8 switch off and the rest fire 1-7-6-4. The motion is shown 50 times slower than real time. The body is a generic shell.",
  });
  window.fig = F; window.setStage = setStage; window.state = state;
  setStage(0);
  F.focus(null, { snap: true });
})();
