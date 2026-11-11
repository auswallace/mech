/* Twin-turbo hot-V V8 in a performance SUV. Units: centimetres. x forward, y left, z up.
   The body is an original, generic shell. The engine follows the published layout of a 4.0 litre, 90 degree,
   twin-turbo V8: bore x stroke 86 x 86 mm, cylinders 1-4 on the right bank and 5-8 on the left,
   firing order 1-3-7-2-6-5-4-8, turbochargers inside the V, cylinders 2, 3, 5 and 8 switched off in 4-cylinder mode. */
(function () {
  const THEME = document.documentElement.dataset.theme || "dark";
  const D = Math.PI / 180;

  // ---------- the model: every number on screen comes from here ----------
  const M = {
    stroke: 8.6, bore: 8.6, rod: 15.0, spacing: 9.0,
    order: [1, 3, 7, 2, 6, 5, 4, 8],
    codOff: [2, 3, 5, 8], codMaxRpm: 3500,
    bank: [-45 * D, 45 * D],                      // right bank (cyl 1-4), left bank (cyl 5-8), from vertical
    pin: [-45 * D, 45 * D, -135 * D, 135 * D],    // cross-plane crank pins, front to rear
    idle: 800, redline: 6800, slow: 50,           // shown 50x slower than real time
    valve: { lift: 0.95, half: 115, intake: 450, exhaust: 270 },   // crank degrees after that cylinder fires
  };
  M.r = M.stroke / 2;
  M.fireAt = {}; M.order.forEach((c, i) => (M.fireAt[c] = i * 90));
  M.pistonAt = (theta, i, b) => { const a = theta + M.pin[i] - M.bank[b]; return { a, s: M.r * Math.cos(a) + Math.sqrt(M.rod * M.rod - (M.r * Math.sin(a)) ** 2) }; };
  M.since = (n, cyc) => (((cyc - M.fireAt[n]) % 720) + 720) % 720;
  M.lift = (d, centre) => { let x = Math.abs(d - centre); x = Math.min(x, 720 - x); return x >= M.valve.half ? 0 : M.valve.lift * Math.cos((x / M.valve.half) * Math.PI / 2) ** 2; };
  const state = { rpm: 1200, theta: 0, cod: false, stage: 0, win: null, phase: 0, fire: false, labels: true, flow: false, style: location.hash === "#line" ? "line" : "real" };
  let F = null;

  function start() {
    if (F) F.dispose();
    F = new mech.Figure("#fig", { theme: THEME, style: state.style, width: 760, height: 480, azimuth: 38, elevation: 24 });
    const REAL = state.style === "real";

    // ---------- body shell (original design) ----------
    const WB = 150, WHEEL_R = 39;
    const bodyKeys = [[252, 58, 54, 80, 3.2], [246, 86, 38, 90, 4], [226, 96, 29, 96, 5], [150, 99, 26, 101, 5.5], [114, 99, 26, 104.5, 5.5], [0, 100, 26, 107, 5.5], [-150, 100, 26, 110, 5.5], [-216, 97, 30, 112, 5], [-243, 90, 38, 108, 4], [-252, 70, 54, 97, 3.2]];
    const bodySec = mech.sweep(bodyKeys, 116).map(([x, W, zb, zt, e]) => ({ x, pts: mech.superSection(W, zb, zt, e, 64) }));
    const inArch = (i, j, n) => { const a = bodySec[i].pts[j], b = bodySec[i + 1].pts[(j + 1) % n], y = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2, x = (bodySec[i].x + bodySec[i + 1].x) / 2; return Math.abs(y) > 78 && (Math.hypot(x - WB, z - WHEEL_R) < 43.5 || Math.hypot(x + WB, z - WHEEL_R) < 43.5); };
    const isHood = (i, j, n, x) => { const a = ((j + 0.5) / n) * 360; return x < 240 && x > 118 && a > 30 && a < 150; };
    F.add(mech.loftGeo(bodySec, { filter: (i, j, n, x) => !isHood(i, j, n, x) && !inArch(i, j, n) }), { mat: "paint", side: "double", tag: "body", edges: 34 });
    for (const [si, sx] of [[0, 1], [bodySec.length - 1, -1]]) { const s = bodySec[si]; F.add(mech.loftGeo([{ x: s.x, pts: s.pts }, { x: s.x + sx * 0.6, pts: s.pts.map((p) => [p[0] * 0.5, (p[1] - 67) * 0.5 + 67]) }, { x: s.x + sx * 0.7, pts: s.pts.map(() => [0, 67]) }], { caps: false }), { mat: "paint", side: "double", tag: "body", edges: false }); }
    const hood = F.group({ at: [118, 0, 104.4] });
    const hg = mech.loftGeo(bodySec, { filter: isHood }); hg.translate(-118, 0, -104.4);
    F.add(hg, { mat: "paint", side: "double", group: hood, tag: "hood", edges: 34 });
    F.onFrame(() => (hood.rotation.y = -0.95 * F.ch("hood")));
    // glasshouse and roof
    const glassKeys = [[120, 82, 101, 103.5, 3], [64, 80, 101, 157, 3.2], [8, 79, 102, 170, 3.4], [-70, 79, 104, 170, 3.4], [-150, 76, 106, 157, 3.2], [-222, 70, 108, 124, 3], [-240, 66, 108, 111, 3]];
    const glassSec = mech.sweep(glassKeys, 48).map(([x, W, zb, zt, e]) => ({ x, pts: mech.superSection(W, zb, zt, e, 48) }));
    const isRoof = (i, j, n, x) => { const a = ((j + 0.5) / n) * 360; return x < 58 && x > -168 && a > 52 && a < 128; };
    F.add(mech.loftGeo(glassSec, { filter: (i, j, n, x) => !isRoof(i, j, n, x) }), { mat: "glass", side: "double", tag: "body", edges: 34 });
    F.add(mech.loftGeo(glassSec, { filter: isRoof }), { mat: "paint", side: "double", tag: "body", edges: 34 });
    // nose and tail details
    F.box({ w: 5, d: 96, h: 26, r: 6 }, { mat: "plastic", at: [251.4, 0, 47], tag: "body" });                         // grille opening
    for (let i = 0; i < 6; i++) F.box({ w: 0.8, d: 90, h: 1 }, { mat: "darkSteel", at: [253.8, 0, 50 + i * 4], tag: "body", edges: false, shadow: false });
    for (const s of [-1, 1]) {
      F.box({ w: 6, d: 30, h: 5, r: 2 }, { mat: "light", at: [245.6, s * 66, 79], rot: [0, 0, -s * 0.34], tag: "body", shadow: false });   // headlights
      F.box({ w: 5, d: 22, h: 10, r: 3 }, { mat: "plastic", at: [246.2, s * 70, 36], rot: [0, 0, -s * 0.3], tag: "body", shadow: false }); // lower intakes
      F.box({ w: 13, d: 9, h: 8, r: 3 }, { mat: "paint", at: [100, s * 102, 97], tag: "body" });                                          // mirrors
      for (const x of [22, -86]) F.box({ w: 11, d: 1.4, h: 1.6, r: 0.6 }, { mat: "chrome", at: [x, s * 100.2, 92], tag: "body", edges: false, shadow: false });
      for (const x of [-WB, WB]) F.lathe([[47.4, 0], [47.4, 1.3], [41.4, 1.3], [41.4, -30], [47, -30]], { axis: "y", n: 56 }, { mat: "plastic", side: "double", at: [x, s * 99.4, WHEEL_R], rot: [s > 0 ? 0 : Math.PI, 0, 0], tag: "body", edges: 40 });   // arch trim and wheel well
      F.box({ w: 200, d: 3, h: 7, r: 1.4 }, { mat: "plastic", at: [0, s * 99.6, 25], tag: "body", edges: false });                         // sill
    }
    F.box({ w: 3, d: 150, h: 3.4, r: 1.4 }, { color: 0xc8372f, at: [-250.6, 0, 97], tag: "body", shadow: false, edges: false });           // tail light bar
    F.box({ w: 4, d: 120, h: 12, r: 3 }, { mat: "plastic", at: [-250.2, 0, 42], tag: "body", shadow: false });                              // rear diffuser

    // ---------- wheels ----------
    for (const x of [-WB, WB]) for (const s of [-1, 1]) {
      const W = F.group({ at: [x, s * 86, WHEEL_R] });
      const o = { group: W, tag: "wheel" };
      F.lathe([[26, -14.5], [35.5, -14.5], [38.6, -11.5], [39, -6], [39, 6], [38.6, 11.5], [35.5, 14.5], [26, 14.5]], { axis: "y", n: 48 }, { mat: "rubber", ...o });
      F.lathe([[27, -14], [27, 13.4], [28.4, 14.6], [28.4, 12.6], [25.4, 12.2], [25.4, -14]], { axis: "y", n: 48 }, { mat: "darkSteel", ...o });
      F.cyl({ r: 20.5, h: 3, n: 36, axis: "y" }, { mat: "steel", at: [0, s * 5 - 1.5, 0], ...o, info: "brake" });                                         // brake disc
      F.box({ w: 15, d: 6, h: 9, r: 2.5 }, { color: 0xc8372f, at: [-13, s * 5, 8], ...o, edges: false });                                  // caliper
      for (let k = 0; k < 10; k++) F.box({ w: 2.4, d: 2, h: 25.4, r: 0.8 }, { mat: "machined", at: [0, s * 11.6, 0], rot: [0, (k * 36) * D + (k % 2 ? 0.12 : -0.12), 0], ...o, edges: false, shadow: false });
      F.lathe([[0, 2.6], [4.6, 2.2], [6.4, 0], [6.4, -2]], { axis: "y", n: 24 }, { mat: "darkSteel", at: [0, s * 11.6, 0], rot: [s > 0 ? 0 : Math.PI, 0, 0], ...o });
    }

    // ---------- chassis and driveline ----------
    const C = { tag: "chassis" };
    F.box({ w: 440, d: 150, h: 3, r: 6 }, { mat: "darkSteel", at: [-8, 0, 27], ...C });
    F.box({ w: 3, d: 150, h: 62, r: 2 }, { mat: "darkSteel", at: [112, 0, 30], ...C });                                                    // firewall
    for (const x of [22, -78]) for (const s of [-1, 1]) {
      F.box({ w: 50, d: 48, h: 13, r: 6 }, { mat: "plastic", at: [x, s * 38, 44], ...C });
      F.box({ w: 12, d: 48, h: 62, r: 5 }, { mat: "plastic", at: [x - 27, s * 38, 52], rot: [0, -0.22, 0], ...C });
      F.box({ w: 9, d: 22, h: 14, r: 3.5 }, { mat: "plastic", at: [x - 41, s * 38, 114], rot: [0, -0.22, 0], ...C });
    }
    F.box({ w: 62, d: 104, h: 16, r: 6 }, { mat: "plastic", at: [-112, 0, 30], ...C, info: "tank" });                                                    // fuel tank
    F.box({ w: 40, d: 30, h: 14, r: 2 }, { mat: "castAl", at: [-206, 32, 34], ...C, info: "battery" });                                                     // 48 V battery
    F.fins(5, { x: -220, y: 32, z: 48, w: 1, d: 24, h: 1.5, gap: 7 }, { mat: "castAl", ...C });
    F.lathe([[17, 0], [17, 4], [15, 16], [12, 16]], { axis: "x", n: 40 }, { mat: "castAl", at: [154, 0, 50], rot: [0, 0, Math.PI], ...C });       // bell housing
    F.box({ w: 72, d: 30, h: 28, r: 9 }, { mat: "castAl", at: [103, 0, 36], ...C, info: "gearbox" });                                                       // 8-speed gearbox
    for (let i = 0; i < 6; i++) F.box({ w: 1.2, d: 31.4, h: 29, r: 9 }, { mat: "castAl", at: [76 + i * 11, 0, 35.5], edges: false, ...C });
    F.box({ w: 60, d: 26, h: 4, r: 3 }, { mat: "plastic", at: [103, 0, 32.6], ...C });                                                     // gearbox pan
    F.cyl({ r: 10, h: 12, n: 28, axis: "x" }, { mat: "castAl", at: [56, 0, 46], ...C });                                                   // centre differential
    F.cyl({ r: 3, h: 190, n: 16, axis: "x" }, { mat: "steel", at: [-134, 0, 44], ...C, info: "propshaft" });                                                  // propshaft
    F.box({ w: 28, d: 32, h: 24, r: 9 }, { mat: "castAl", at: [-150, 0, 28], ...C, info: "rearDiff" });                                                      // rear differential
    for (const x of [-WB, WB]) F.cyl({ r: 2.6, h: 150, n: 14, axis: "y" }, { mat: "steel", at: [x, -75, 39], ...C });                      // half shafts
    F.box({ w: 5, d: 124, h: 48, r: 2 }, { mat: "castAl", at: [233, 0, 34], ...C, info: "radiator" });                                                       // radiator pack
    for (let i = 0; i < 24; i++) F.box({ w: 0.6, d: 0.8, h: 44 }, { mat: "darkSteel", at: [235.8, -57.5 + i * 5, 36], edges: false, shadow: false, ...C });
    for (const s of [-1, 1]) {
      F.tube([[141, s * 11, 42], [118, s * 13, 34], [20, s * 14, 32], [-120, s * 15, 46], [-170, s * 44, 34], [-194, s * 55, 37]], 3.2, { mat: "steel", ...C });
      F.lathe([[0, 0], [8, 1], [10.5, 5], [10.5, 39], [8, 43], [0, 44]], { axis: "x", n: 28 }, { mat: "steel", at: [-238, s * 56, 38], ...C, info: "silencer" });      // rear silencer
      const tip = F.lathe([[5.2, 0], [6, 0], [6, 10], [5.2, 10]], { axis: "x", n: 28 }, { mat: "chrome", at: [-256, s * 62, 36], ...C }); tip.scale.set(1, 1.7, 1);
    }

    // ---------- engine ----------
    const E = F.group({ at: [176, 0, 50] });
    const sh = (o) => ({ group: E, tag: "shell", ...o });
    F.box({ w: 42, d: 21, h: 18, r: 3 }, sh({ mat: "castAl", at: [0, 0, -10], info: "block" }));                                                          // crankcase
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) F.box({ w: 1, d: 1.2, h: 15, r: 0.3 }, sh({ mat: "castAl", at: [-17.5 + i * 7, s * 10.6, -9], edges: false }));
    F.box({ w: 38, d: 17, h: 8, r: 3.5 }, sh({ mat: "darkSteel", at: [0, 0, -18], explode: [0, 0, -12], channel: "ap2", info: "oilPan" }));                // oil pan
    F.fins(9, { x: -16, y: 0, z: -18.7, w: 0.9, d: 15, h: 0.9, gap: 4 }, sh({ mat: "darkSteel", edges: false, explode: [0, 0, -12], channel: "ap2" }));
    F.cyl({ r: 1, h: 1.6, n: 6 }, sh({ mat: "steel", at: [12, 0, -19.4], rot: [Math.PI, 0, 0], explode: [0, 0, -12], channel: "ap2" }));   // drain plug
    F.box({ w: 2.4, d: 34, h: 30, r: 7 }, sh({ mat: "castAl", at: [22, 0, -9], explode: [9, 0, 0], channel: "ap2" }));                     // front cover
    F.lathe([[0, 0], [3.4, 0.4], [3.8, 1.2], [3.8, 9], [3.2, 10], [0, 10]], { axis: "x", n: 24 }, sh({ mat: "plastic", at: [14, 14, -15], explode: [9, 6, 0], channel: "ap2" }));   // oil filter
    F.box({ w: 34, d: 19, h: 0.8, r: 2 }, { mat: "darkSteel", at: [-1, 0, 20.6], group: E, tag: "turbo", explode: [0, 0, 36], channel: "ap1" });   // heat shield in the V
    const cylX = (i, b) => (1.5 - i) * M.spacing + (b ? -0.9 : 0.9);
    const cyls = [], cams = [], banks = [];
    [0, 1].forEach((b) => {
      const sgn = b ? 1 : -1;
      const B = F.group({ group: E, rot: [-M.bank[b], 0, 0] }); banks.push(B);
      const bk = (o) => ({ group: B, tag: "shell", ...o }), hd = (o) => bk({ explode: [0, 0, 10], channel: "ap2", info: "head", ...o }), cv = (o) => bk({ explode: [0, 0, 24], channel: "ap3", info: "cover", ...o });
      F.box({ w: 41, d: 11.4, h: 16.5, r: 1.2 }, bk({ mat: "castAl", at: [0, 0, 7], info: "block" }));                                                    // cylinder bank
      for (let i = 0; i < 5; i++) F.box({ w: 1, d: 1, h: 13, r: 0.3 }, bk({ mat: "castAl", at: [-18 + i * 9, sgn * 5.9, 9], edges: false }));
      F.box({ w: 41, d: 13, h: 7.5, r: 1.6 }, hd({ mat: "castAl", at: [0, 0, 23.5] }));                                                    // cylinder head
      F.screws([-18, -9, 0, 9, 18].flatMap((x) => [[x, 5.6, 31], [x, -5.6, 31]]), 0.55, hd({ mat: "steel" }));
      F.box({ w: 39.5, d: 12, h: 2.8, r: 3 }, cv({ mat: "plastic", at: [0, 0, 31] }));                                                     // cam cover
      for (const y of [-3.4, 3.4]) F.lathe([[0, 0], [1.5, 0.6], [1.8, 2], [1.8, 36], [1.5, 37.4], [0, 38]], { axis: "x", n: 16 }, cv({ mat: "plastic", at: [-19, y, 33.1], edges: false }));
      F.box({ w: 36, d: 6.6, h: 9, r: 3.2 }, hd({ mat: "plastic", at: [0, sgn * 10.2, 20.5], explode: [0, sgn * 13, 6], info: "plenum" }));                 // intake plenum, outboard
      F.tube([[-17.5, sgn * 7.3, 30.4], [17.5, sgn * 7.3, 30.4]], 0.6, hd({ mat: "steel", info: "fuel" }));                                              // fuel rail
      F.tube([[-15, -sgn * 1.4, 34.6], [-5, -sgn * 2.2, 34.4], [5, -sgn * 2.2, 34.4], [15, -sgn * 1.4, 34.6], [19.6, -sgn * 3, 33]], 0.5, cv({ mat: "rubber" }));   // coil harness
      const cam = [1, -1].map((side) => {                                                                                                  // side 1 = intake (outboard), -1 = exhaust (inboard)
        const G = F.group({ group: B, at: [0, side * sgn * 2.3, 32.3], explode: [0, 0, 10], channel: "ap2", info: "cam" });
        F.cyl({ r: 0.75, h: 38, n: 12, axis: "x" }, { mat: "steel", at: [-19, 0, 0], group: G, tag: "valve", edges: false });
        return G;
      });
      cams.push(...cam);
      for (let i = 0; i < 4; i++) {
        const n = b * 4 + i + 1, x = cylX(i, b);
        F.box({ w: 5, d: 3.6, h: 4.4, r: 1.4 }, hd({ mat: "plastic", at: [x, sgn * 7.4, 24.4], info: "plenum" }));                                         // intake runner
        F.cyl({ r: 0.7, h: 2.2, n: 10 }, hd({ mat: "brass", at: [x, sgn * 7.3, 29.2], edges: false, info: "fuel" }));                                    // injector
        F.lathe([[0, 0], [1.6, 0], [1.6, 2.2], [1.2, 3], [0, 3]], { n: 14 }, cv({ mat: "plastic", at: [x, 0, 33.6], info: "coil" }));                    // ignition coil
        const coil = F.led([x, 0, 36.5], 0.7, { group: B, color: 0xffa033, tag: "shell", explode: [0, 0, 24], channel: "ap3" });
        const piston = F.lathe([[0, 5], [3.9, 5], [4.15, 4.7], [4.15, 0], [3.4, 0], [3.4, 3.6], [0, 3.6]], { n: 32 }, { mat: "machined", at: [x, 0, 0], group: B, tag: "moving", info: "piston" });
        for (const z of [3.4, 4.0]) F.torus({ R: 4.16, r: 0.11, n: 32 }, { mat: "darkSteel", at: [0, 0, z], group: piston, tag: "moving", shadow: false });
        const rod = F.box({ w: 1.6, d: 2.6, h: M.rod, r: 0.6 }, { mat: "steel", at: [x, 0, 0], group: B, tag: "moving", info: "rod" });
        F.cyl({ r: 3.3, h: 1.6, n: 20, axis: "x" }, { mat: "steel", at: [-0.8, 0, 0], group: rod, tag: "moving", edges: false });           // big end
        const fire = F.cyl({ r: 4.0, h: 1.0, n: 24 }, { color: 0xffa033, at: [x, 0, 22.3], group: B, tag: "fire", edges: false, shadow: false });
        fire.material.emissive.set(0xff7a1a); fire.visible = false;
        const valves = [];
        for (const side of [1, -1]) for (const dx of [-1.9, 1.9]) {
          const v = F.lathe([[0, 0], [1.45, 0], [1.45, 0.25], [0.32, 1.3], [0.32, 8.6], [0, 8.6]], { n: 14 }, { mat: "machined", at: [x + dx, side * sgn * 2.3, 23.1], group: B, tag: "valve", edges: false, shadow: false, info: side === 1 ? "intakeValve" : "exhaustValve" });
          valves.push({ v, intake: side === 1 });
          const phi = (180 - (M.fireAt[n] + (side === 1 ? M.valve.intake : M.valve.exhaust)) / 2) * D;
          F.cyl({ r: 1.0, h: 1.3, n: 14, axis: "x" }, { mat: "machined", at: [x + dx - 0.65, 0.42 * Math.sin(phi), 0.42 * Math.cos(phi)], group: cam[side === 1 ? 0 : 1], tag: "valve", edges: false, shadow: false });   // cam lobe
        }
        cyls.push({ n, i, b, x, piston, rod, fire, coil, valves });
      }
    });
    // crankshaft, cross-plane
    const crank = F.group({ group: E, info: "crank" });
    const mv = (o) => ({ group: crank, tag: "moving", ...o });
    F.cyl({ r: 3, h: 50, n: 24, axis: "x" }, mv({ mat: "steel", at: [-25, 0, 0] }));
    M.pin.forEach((phi, i) => {
      const x = (1.5 - i) * M.spacing, py = M.r * Math.sin(phi), pz = M.r * Math.cos(phi);
      F.cyl({ r: 2.5, h: 4.4, n: 18, axis: "x" }, mv({ mat: "machined", at: [x - 2.2, py, pz] }));
      for (const dx of [-3.4, 2.2]) F.lathe([[0, 0], [6.6, 0], [7.2, 0.3], [7.2, 0.9], [6.6, 1.2], [0, 1.2]], { axis: "x", n: 30 }, mv({ mat: "steel", at: [x + dx, -py * 0.45, -pz * 0.45] }));   // webs and counterweights
    });
    F.lathe([[0, 0], [7.4, 0], [8, 0.4], [8, 2.6], [7.4, 3], [0, 3]], { axis: "x", n: 36 }, { mat: "machined", at: [24.6, 0, 0], group: crank, tag: "aux" });   // crank pulley
    F.box({ w: 0.5, d: 1.6, h: 7.4 }, { mat: "darkSteel", at: [27.5, 0, 0], group: crank, tag: "aux", edges: false, shadow: false });
    F.lathe([[0, 0], [13, 0], [15, 0.4], [15, 2], [13, 2.4], [0, 2.4]], { axis: "x", n: 44 }, mv({ mat: "steel", at: [-25.5, 0, 0], info: "flywheel" }));     // flywheel
    // 48 V belt starter generator and belt
    const ax = (o) => ({ group: E, tag: "aux", explode: [10, -8, 0], channel: "ap2", info: "bsg", ...o });
    F.lathe([[0, 0], [5.4, 0.6], [6, 2], [6, 11], [5.4, 12.4], [0, 13]], { axis: "x", n: 28 }, ax({ mat: "castAl", at: [10, -25, -2] }));
    for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; F.box({ w: 8, d: 0.5, h: 0.9 }, ax({ mat: "castAl", at: [16.5, -25 + Math.sin(a) * 6, -2 + Math.cos(a) * 6], rot: [-a, 0, 0], edges: false, shadow: false })); }
    const bsgPulley = F.cyl({ r: 3.4, h: 3, n: 20, axis: "x" }, ax({ mat: "machined", at: [24.6, -25, -2] }));
    F.tube([[26.1, 0, 8.4], [26.1, -25, 1.6], [26.1, -28.6, -2], [26.1, -25, -5.6], [26.1, 0, -8.4], [26.1, 8.4, 0]], 0.75, { mat: "rubber", closed: true, group: E, tag: "aux" });
    // turbochargers in the V, one per bank
    const tb = (o) => ({ explode: [0, 0, 36], channel: "ap1", ...o });
    const turbos = [0, 1].map((b) => {
      const sgn = b ? 1 : -1, tx = b ? -6 : 4, ty = sgn * 6.5, tz = 28.4;
      const G = F.group({ group: E, at: [tx, ty, tz], explode: [0, 0, 36], channel: "ap1", info: "turbo" });
      const t = (o) => ({ group: G, tag: "turbo", ...o });
      F.lathe([[0, -2.4], [2.6, -2.4], [3, -1.6], [2.2, -0.8], [2.2, 0.8], [3, 1.6], [2.6, 2.4], [0, 2.4]], { axis: "x", n: 20 }, t({ mat: "castAl" }));          // bearing housing
      F.add(mech.voluteGeo({ R: 3.3, r0: 1.1, r1: 2.3 }), t({ mat: "castAl", at: [4.3, 0, 0], edges: false }));                                                   // compressor scroll
      F.lathe([[0, -1.6], [3.4, -1.6], [3.6, -0.6], [3.3, 1.4], [2.6, 2], [2.6, 4.6], [3, 4.6], [3, 5], [2.1, 5], [2.1, 1.6], [0, 1.2]], { axis: "x", n: 28 }, t({ mat: "castAl", at: [4.2, 0, 0] }));   // compressor cover and inlet
      const hot = F.add(mech.voluteGeo({ R: 3.1, r0: 1.1, r1: 2.25 }), t({ mat: "iron", at: [-4.6, 0, 0], rot: [Math.PI * 0.6, 0, 0], edges: false }));           // turbine scroll
      const hub = F.lathe([[0, -2], [3.2, -2], [3.5, -1], [3.5, 1], [3.2, 2], [0, 2]], { axis: "x", n: 28 }, t({ mat: "iron", at: [-4.6, 0, 0] }));
      F.torus({ R: 3.1, r: 0.34, axis: "x" }, t({ mat: "chrome", at: [-2.5, 0, 0] }));                                                                           // V-band clamp
      F.lathe([[0, 0], [1.5, 0.3], [1.5, 4.4], [0.5, 5], [0.5, 8]], { axis: "y", n: 14 }, t({ mat: "steel", at: [-1, sgn > 0 ? -1 : -7, 5.4], edges: false }));   // wastegate actuator
      const wheel = F.group({ group: G, at: [9.3, 0, 0] });
      for (let k = 0; k < 9; k++) F.box({ w: 0.5, d: 0.5, h: 2 }, { mat: "machined", rot: [k * 40 * D, 0.5, 0], group: wheel, tag: "turbo", edges: false, shadow: false });
      F.cyl({ r: 0.7, h: 0.8, n: 10, axis: "x" }, { mat: "machined", at: [-0.2, 0, 0], group: wheel, tag: "turbo", edges: false });
      const p = (o) => tb({ group: E, tag: "pipes", ...o });
      const runners = [];
      for (let i = 0; i < 4; i++) {
        const x = cylX(i, b);
        runners.push(F.tube([[x, sgn * 14.6, 23.6], [(x + tx - 4.6) / 2, sgn * 13.3, 25.8], [tx - 4.6, sgn * 11.2, 27.4]], 1.3, p({ mat: "steel", info: "manifold" })));
        F.box({ w: 3.6, d: 0.7, h: 3.6, r: 0.8 }, p({ mat: "steel", at: [x, sgn * 14.4, 22.2], rot: [-sgn * 45 * D, 0, 0], edges: false }));                       // port flange
      }
      const down = F.tube([[tx - 6.8, ty, tz], [-22, sgn * 8, 28], [-31, sgn * 10, 12], [-35, sgn * 11, -8]], 3, p({ mat: "steel", info: "downpipe" }));
      F.torus({ R: 3.2, r: 0.4, axis: "x" }, p({ mat: "chrome", at: [tx - 8.6, ty, tz] }));
      F.tube([[tx + 9.2, ty, tz], [26, sgn * 11, 30], [33, sgn * 22, 26], [38, sgn * 29, 22]], 2.8, p({ mat: "rubber", info: "airbox" }));                                        // air intake hose
      F.torus({ R: 3, r: 0.35, axis: "x" }, p({ mat: "steel", at: [tx + 10.4, ty, tz] }));
      F.box({ w: 18, d: 18, h: 14, r: 5 }, p({ mat: "plastic", at: [42, sgn * 32, 10], info: "airbox" }));                                                                         // air filter box
      F.box({ w: 14, d: 14, h: 1, r: 4 }, p({ mat: "plastic", at: [42, sgn * 32, 24], edges: false }));
      F.tube([[tx + 4.3, sgn * 11.6, 31.6], [21, sgn * 15, 33], [26, sgn * 26, 27], [21, sgn * 27.5, 15.5], [17, sgn * 25.6, 13]], 2.1, p({ mat: "castAl", info: "chargePipe" }));    // charge pipe
      F.torus({ R: 2.3, r: 0.4, axis: "x" }, p({ mat: "rubber", at: [21, sgn * 15, 33], rot: [0, 0, sgn * 0.5] }));
      F.flow([[44, sgn * 34, 20], [38, sgn * 29, 22], [33, sgn * 22, 26], [26, sgn * 11, 30], [tx + 9.2, ty, tz], [tx + 4.3, sgn * 11.6, 31.6], [21, sgn * 15, 33], [26, sgn * 26, 27], [21, sgn * 27.5, 15.5], [10, sgn * 25.4, 13]], { color: 0x4aa8ff, count: 12, speed: 0.22, r: 1, group: E, set: "engine" });
      F.flow([[cylX(1, b), sgn * 14.6, 23.6], [tx - 4.6, sgn * 11.2, 27.4], [tx - 6.8, ty, tz], [-22, sgn * 8, 28], [-31, sgn * 10, 12], [-35, sgn * 11, -8]], { color: 0xff8a2a, count: 8, speed: 0.3, r: 1, group: E, set: "engine" });
      return { hot, hub, wheel, runners, down };
    });

    // ---------- running ----------
    const firing = (n, cyc) => !(state.cod && M.codOff.includes(n)) && M.since(n, cyc) < 70;
    F.onFrame((dt) => {
      if (state.cod && state.rpm > M.codMaxRpm) setCod(false);
      if (state.win) { state.phase = (state.phase + dt * 36) % (state.win[1] - state.win[0]); state.theta = (state.win[0] + state.phase) * D; }
      else if (!F.reduced) state.theta += (state.rpm * 6 * D * dt) / M.slow;
      const th = state.theta, cyc = ((th / D) % 720 + 720) % 720, headUp = 10 * F.ch("ap2");
      crank.rotation.x = -th; bsgPulley.rotation.x = -th * 2.35;
      cams.forEach((c) => (c.rotation.x = -(cyc / 2) * D));
      for (const c of cyls) {
        const { a, s } = M.pistonAt(th, c.i, c.b);
        c.piston.position.z = s - 2.5;
        c.rod.position.set(c.x, M.r * Math.sin(a), M.r * Math.cos(a));
        c.rod.rotation.x = Math.atan2(M.r * Math.sin(a), s - M.r * Math.cos(a));
        const on = firing(c.n, cyc), off = state.cod && M.codOff.includes(c.n), d = M.since(c.n, cyc);
        c.fire.visible = on && state.fire;
        F.setLed(c.coil, on);
        for (const k of c.valves) k.v.position.z = 23.1 + headUp - (off ? 0 : M.lift(d, k.intake ? M.valve.intake : M.valve.exhaust));
      }
      const load = (state.rpm - M.idle) / (M.redline - M.idle);
      for (const t of turbos) {
        t.wheel.rotation.x -= (0.6 + load * 5) * 6 * dt;
        F.glow(t.hot, 0.04 + load * 0.8); F.glow(t.hub, 0.04 + load * 0.8); t.runners.forEach((r) => F.glow(r, 0.02 + load * 0.6)); F.glow(t.down, load * 0.3);
      }
      const now = state.cod ? [1, 7, 6, 4] : M.order, cur = M.order[Math.floor(cyc / 90) % 8];
      F.flowList.forEach((f) => (f.rate = 0.5 + load * 3));
      if (state.win) return F.readout("cylinder 1 · " + state.winName + " stroke · crank " + Math.round(cyc) + "°");
      F.readout(Math.round(state.rpm).toLocaleString("en-US") + " rpm · firing cyl " + (state.cod && M.codOff.includes(cur) ? "–" : cur) + " · order " + now.join("-"));
    });

    // ---------- what each part is ----------
    F.describe({
      turbo: { name: "Turbocharger", role: "Exhaust gas spins a turbine. The turbine drives a compressor that pushes more air into the engine.", fact: "One per cylinder bank, up to 1.4 bar of boost." },
      manifold: { name: "Exhaust manifold", role: "Short pipes that carry exhaust from the head into the turbine." },
      downpipe: { name: "Downpipe", role: "Carries exhaust from the turbine to the exhaust system under the car." },
      chargePipe: { name: "Charge pipe", role: "Carries compressed air from the turbo to the intake plenum." },
      airbox: { name: "Air filter and intake", role: "Cleans the fresh air and feeds it to the turbo." },
      plenum: { name: "Intake plenum", role: "Shares the compressed air between the four cylinders of one bank." },
      fuel: { name: "Fuel rail and injectors", role: "Spray petrol straight into each cylinder." },
      coil: { name: "Ignition coil", role: "Makes the high voltage for the spark plug below it." },
      cover: { name: "Cam cover", role: "Seals the top of the head over the camshafts." },
      head: { name: "Cylinder head", role: "Closes the top of the cylinders. It holds the valves, camshafts, spark plugs and injectors.", fact: "Four valves per cylinder, 32 in total." },
      block: { name: "Cylinder block", role: "Holds the eight cylinders in two banks and carries the crankshaft.", fact: "The two banks are 90 degrees apart." },
      piston: { name: "Piston", role: "Burning gas pushes it down. That push is the engine's power.", fact: "86 mm bore, 86 mm stroke." },
      rod: { name: "Connecting rod", role: "Links the piston to the crankshaft and turns the up-and-down motion into rotation." },
      crank: { name: "Crankshaft", role: "Collects the push of all eight pistons into one turning shaft.", fact: "Cross-plane: the four crank pins are 90 degrees apart." },
      flywheel: { name: "Flywheel", role: "A heavy disc that smooths the pulses and passes the drive to the gearbox." },
      cam: { name: "Camshaft", role: "Its lobes push the valves open at the right time.", fact: "It turns at half the speed of the crankshaft." },
      intakeValve: { name: "Intake valve", role: "Opens to let air into the cylinder." },
      exhaustValve: { name: "Exhaust valve", role: "Opens to let burnt gas out of the cylinder." },
      oilPan: { name: "Oil pan", role: "Holds the engine oil under the crankshaft." },
      bsg: { name: "Belt starter generator", role: "A 48 volt motor on the belt. It restarts the engine and charges the battery when the car slows down.", fact: "It can recover up to 12 kW." },
      gearbox: { name: "Automatic gearbox", role: "Picks the gear ratio between the engine and the wheels.", fact: "8 speeds." },
      propshaft: { name: "Propshaft", role: "Carries the drive to the rear axle." },
      rearDiff: { name: "Rear differential", role: "Splits the drive between the two rear wheels and lets them turn at different speeds." },
      battery: { name: "48 V battery", role: "Stores the energy for the mild-hybrid system." },
      tank: { name: "Fuel tank", role: "Holds the petrol, ahead of the rear axle." },
      radiator: { name: "Radiator pack", role: "Passes heat from the coolant to the air at the front of the car." },
      silencer: { name: "Rear silencer", role: "Lowers the exhaust noise before the tailpipe." },
      brake: { name: "Brake disc", role: "The caliper clamps it to slow the wheel." },
    });
    for (const k of ["turbo", "plenum", "chargePipe", "airbox", "cover", "bsg", "oilPan", "downpipe"]) F.label(k, { set: "engine" });
    for (const k of ["gearbox", "propshaft", "rearDiff", "battery", "tank", "radiator", "silencer"]) F.label(k, { set: "chassis" });
    for (const k of ["piston", "crank", "cam", "flywheel", "rod"]) F.label(k, { set: "inside" });
    F.label("intakeValve", { set: "inside", on: cyls[1].valves[0].v }); F.label("exhaustValve", { set: "inside", on: cyls[1].valves[2].v });
    const c1 = cyls[0];
    F.label("piston", { set: "stroke", on: c1.piston }); F.label("rod", { set: "stroke", on: c1.rod }); F.label("crank", { set: "stroke" });
    F.label("intakeValve", { set: "stroke", on: c1.valves[0].v }); F.label("exhaustValve", { set: "stroke", on: c1.valves[2].v });
    F.flow([[c1.x, -10, 22], [c1.x, -6.4, 27.2], [c1.x, -2.3, 26], [c1.x, -1, 21]], { color: 0x4aa8ff, count: 5, speed: 0.7, r: 0.55, group: banks[0], set: "intake" });
    F.flow([[c1.x, 1, 21], [c1.x, 2.3, 26], [c1.x, 6.5, 27.2], [c1.x, 9, 29]], { color: 0xff8a2a, count: 5, speed: 0.7, r: 0.55, group: banks[0], set: "exhaust" });

    // ---------- stages ----------
    const SETS = [null, null, "chassis", "engine", null, "inside"];
    const view = () => { const fl = state.flow && (state.stage === 3 || state.stage === 5); F.labels(state.labels ? SETS[state.stage] : null); F.flows(fl ? "engine" : null); if (fl && state.stage === 3) F.ghost("pipes", 0.2); state.fire = state.stage === 5; };
    const all = (a) => F.ghost(["body", "hood", "wheel", "chassis", "shell", "aux", "turbo", "pipes", "moving", "valve"], a);
    const apart = (k) => { F.to("ap1", k, 0.22); F.to("ap2", k, 0.38); F.to("ap3", k, 0.55); };
    const box = (a, b) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b));
    const front = box([96, -108, 18], [258, 108, 176]), eng = box([140, -42, 30], [224, 42, 88]), engApart = box([138, -50, 24], [226, 50, 128]);
    const STAGES = [
      { name: "Car", hint: "A front-engined performance SUV. Drag to turn it.", go() { all(1); apart(0); F.shadow(1); F.to("hood", 0); F.focus(null, { azimuth: 38, elevation: 22 }); } },
      { name: "Hood up", hint: "The V8 sits lengthwise, ahead of the front axle.", go() { all(1); apart(0); F.shadow(1); F.to("hood", 1, 0.4); F.focus(front, { azimuth: 58, elevation: 36, pad: 1.1 }); } },
      { name: "See-through", hint: "Engine, 8-speed gearbox, propshaft, both axles, twin exhausts, 48 V battery at the back.", go() { all(1); apart(0); F.shadow(0.5); F.ghost(["body", "hood"], 0.05); F.ghost("wheel", 0.4); F.to("hood", 0); F.focus(null, { azimuth: 30, elevation: 34 }); } },
      { name: "Engine", hint: "Two turbochargers sit inside the V. Exhaust goes in from the middle, fresh air comes in from the outside.", go() { all(1); apart(0); F.shadow(0); F.ghost(["body", "hood", "wheel"], 0); F.ghost("chassis", 0.03); F.to("hood", 0); F.focus(eng, { azimuth: 42, elevation: 30, pad: 1.05 }); } },
      { name: "Apart", hint: "Turbos and pipes lift out of the V. Cam covers, heads and oil pan come off the block.", go() { all(1); apart(1); F.shadow(0); F.ghost(["body", "hood", "wheel", "chassis"], 0); F.to("hood", 0); F.focus(engApart, { azimuth: 36, elevation: 26, pad: 1.0 }); } },
      { name: "Inside", hint: "Eight pistons on a cross-plane crank, 32 valves on four camshafts. The flash is the cylinder that fires.", go() { all(1); apart(0); F.shadow(0); F.ghost(["body", "hood", "wheel", "chassis"], 0); F.ghost("shell", 0.06); F.ghost("pipes", 0.05); F.ghost("aux", 0.2); F.ghost("turbo", 0.1); F.to("hood", 0); F.focus(eng, { azimuth: 24, elevation: 20, pad: 0.95 }); } },
    ];

    // ---------- controls ----------
    const bar = document.createElement("div"); bar.className = "mech-controls";
    bar.innerHTML = STAGES.map((s, i) => `<button data-stage="${i}">${i + 1} ${s.name}</button>`).join("") +
      `<span class="sp"></span><span>Throttle</span><input type="range" min="${M.idle}" max="${M.redline}" step="50" value="${state.rpm}" aria-label="Engine speed in rpm"><button data-cod aria-pressed="${state.cod}">4-cylinder mode</button><span class="sp"></span><button data-t="labels" aria-pressed="${state.labels}">Labels</button><button data-t="flow" aria-pressed="${state.flow}">Air and exhaust flow</button><button data-t="lesson">Lesson: the four strokes</button><button data-t="quiz">Quiz</button><button data-style>${REAL ? "Line view" : "Real view"}</button>`;
    F.mount.querySelector(".mech-stage").after(bar);
    const hintEl = F.mount.querySelector(".mech-hint"), codBtn = bar.querySelector("[data-cod]"), slider = bar.querySelector("input");
    function setStage(i, quiet) { if (!quiet) F.touch(); state.win = null; state.stage = ((i % STAGES.length) + STAGES.length) % STAGES.length; STAGES[state.stage].go(); view(); hintEl.textContent = STAGES[state.stage].hint; bar.querySelectorAll("[data-stage]").forEach((b, k) => b.setAttribute("aria-pressed", k === state.stage)); }
    function setCod(on) { state.cod = on && state.rpm <= M.codMaxRpm; codBtn.setAttribute("aria-pressed", state.cod); }
    bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F.touch(); if (b.dataset.stage) setStage(+b.dataset.stage); else if ("style" in b.dataset) { state.style = REAL ? "line" : "real"; start(); }
      else if (b.dataset.t === "labels" || b.dataset.t === "flow") { state[b.dataset.t] = !state[b.dataset.t]; b.setAttribute("aria-pressed", state[b.dataset.t]); if (b.dataset.t === "flow" && state.stage < 3) setStage(3); else setStage(state.stage, true); }
      else if (b.dataset.t === "lesson") lesson.open(0); else if (b.dataset.t === "quiz") { setStage(5); quiz.start(); } else setCod(!state.cod); });
    // lesson: one cylinder, one stroke at a time. Cylinder 1 fires at crank 0, so each stroke is a 180 degree window.
    const solo = box([172, -34, 44], [200, 6, 86]);
    const stroke = (name, from, flow) => () => {
      all(0); apart(0); F.shadow(0); F.ghost("shell", 0.05); F.ghost(crank, 0.14); F.ghost([c1.piston, c1.rod, ...c1.valves.map((k) => k.v)], 1);
      state.win = [from, from + 180]; state.winName = name; state.phase = 0; state.fire = name === "power";
      F.labels("stroke"); F.flows(flow); F.focus(solo, { azimuth: 78, elevation: 10, pad: 1.0 });
    };
    const lesson = F.lesson([
      { title: "1. Intake", text: "The piston goes down. The intake valves open, and the turbo pushes air into the cylinder.", go: stroke("intake", 360, "intake") },
      { title: "2. Compression", text: "All valves are shut. The piston comes up and squeezes the air. Fuel is sprayed in.", go: stroke("compression", 540, null) },
      { title: "3. Power", text: "The spark lights the mixture. The hot gas pushes the piston down. This is the only stroke that makes power.", go: stroke("power", 0, null) },
      { title: "4. Exhaust", text: "The exhaust valves open. The piston comes up and pushes the burnt gas out toward the turbo.", go: stroke("exhaust", 180, "exhaust") },
      { title: "All eight together", text: "Each cylinder runs the same four strokes, one quarter turn after the last. The order is 1-3-7-2-6-5-4-8, so one cylinder fires every 90 degrees.", go: () => setStage(5, true) },
    ], { onClose: () => setStage(state.stage, true) });
    const quiz = F.quiz([
      { ask: "Click the part that the burning gas pushes down.", key: "piston" },
      { ask: "Click the shaft that turns the push of the pistons into rotation.", key: "crank" },
      { ask: "Click a valve that lets air into a cylinder.", key: "intakeValve" },
      { ask: "Click the shaft that opens the valves.", key: "cam" },
      { ask: "Click the heavy disc that smooths the pulses.", key: "flywheel" },
    ]);
    slider.addEventListener("input", () => { F.touch(); state.rpm = +slider.value; codBtn.disabled = state.rpm > M.codMaxRpm; codBtn.style.opacity = codBtn.disabled ? 0.4 : 1; F.run(); });
    F.stage.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= "6") setStage(+e.key - 1); });
    F.onPress = () => setStage(state.stage + 1);
    F.tour(() => setStage(state.stage + 1, true));

    mech.card("#fig", {
      fig: "Fig 1", title: "Twin-turbo V8 in a performance SUV",
      keys: [{ mark: "lit", label: "Click a part to learn what it does" }, { mark: "mid", label: "Keys 1 to 6 step in. Space goes to the next step. Drag to orbit." }],
      caption: "A 4.0 litre, 90 degree V8 with an 86 mm bore and an 86 mm stroke. Cylinders 1 to 4 are on the right bank and 5 to 8 on the left, and they fire in the order 1-3-7-2-6-5-4-8. Both turbochargers sit inside the V, so the exhaust path from each head to its turbine is short. In 4-cylinder mode, cylinders 2, 3, 5 and 8 keep their valves shut and the rest fire 1-7-6-4. The motion is shown 50 times slower than real time. Valve timing is simplified, and the flow dots show the path of the gas, not its speed. The body is an original, generic shell.",
    });
    window.fig = F; window.setStage = setStage; window.state = state;
    setStage(state.stage, true);
    F.fit(true);
  }
  start();
})();
