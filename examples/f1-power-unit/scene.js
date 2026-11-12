/* 2026-spec Formula 1 power unit in a generic single seater. Units: centimetres. x forward, y left, z up.
   The engine follows the 2026 FIA power unit regulations: 1600 cc, six cylinders in a 90 degree V,
   80 mm bore, crankshaft centre line 90 mm above the reference plane, two inlet and two exhaust valves
   per cylinder, one single stage turbocharger, no MGU-H, a 350 kW MGU-K and a battery in the survival cell.
   The bodywork is an original, generic shape. */
(function () {
  const D = Math.PI / 180;

  // ---------- the model: every number on screen comes from here ----------
  const M = {
    cc: 1600, n: 6, bore: 8.0, rod: 10.2, spacing: 9.8, crankZ: 9.0,
    bank: [-45 * D, 45 * D],                  // right bank (cyl 1-3), left bank (cyl 4-6), from vertical
    pin: { 1: 315, 2: 195, 3: 75, 4: 285, 5: 165, 6: 45 },   // crank journal phase, degrees
    fireAt: { 1: 0, 4: 120, 3: 240, 6: 360, 2: 480, 5: 600 },
    bankOf: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1, 6: 1 },
    station: { 1: 0, 2: 1, 3: 2, 4: 0, 5: 1, 6: 2 },         // which crank pin station, front to rear
    rpmIdle: 4000, rpmMax: 15000, efCap: 3000, efA: 0.27, efB: 165, eta: 0.48,
    mgukMax: 350, mgukA: 1850, mgukB: 5, mgukHigh: 150, mgukCut: 340,
    mgukGear: [28, 20, 10],                   // crank gear, idler, MGU-K gear teeth
    pitch: 1.6,
    turboMax: 150000, esSwing: 4, perLap: 9,
    slow: 60,                                 // shown 60x slower than real time
    kerb: 60,                                 // length of one kerb block, cm
    valve: { lift: 0.85, half: 112, intake: 450, exhaust: 270 },
  };
  M.area = (Math.PI / 4) * M.bore * M.bore;
  M.stroke = M.cc / M.n / M.area;
  M.r = M.stroke / 2;
  M.cap = M.area * M.stroke * M.n;
  M.ef = (rpm) => Math.min(M.efCap, M.efA * rpm + M.efB);
  M.iceKW = (rpm) => (M.ef(rpm) * M.eta) / 3.6;
  M.mgukKW = (v) => (v >= M.mgukCut ? M.mgukHigh : Math.min(M.mgukMax, M.mgukA - M.mgukB * v));
  M.pistonAt = (theta, c) => { const a = theta + M.pin[c] * D - M.bank[M.bankOf[c]]; return { a, s: M.r * Math.cos(a) + Math.sqrt(M.rod * M.rod - (M.r * Math.sin(a)) ** 2) }; };
  M.since = (c, cyc) => (((cyc - M.fireAt[c]) % 720) + 720) % 720;
  M.lift = (d, centre) => { let x = Math.abs(d - centre); x = Math.min(x, 720 - x); return x >= M.valve.half ? 0 : M.valve.lift * Math.cos(((x / M.valve.half) * Math.PI) / 2) ** 2; };
  M.order = Object.keys(M.fireAt).map(Number).sort((a, b) => M.fireAt[a] - M.fireAt[b]);
  M.cmps = (kph) => (kph * 100000) / 3600;                         // road speed, cm a second
  M.spin = (kph, r) => M.cmps(kph) / r;                            // wheel speed, radians a second
  M.wrap = 2 * M.kerb;                                             // the kerb pattern repeats over two blocks
  M.ratio = M.mgukGear[0] / M.mgukGear[2];                         // MGU-K turns this many times per engine turn
  M.pr = (t) => mech.pitchRadius(t, M.pitch);
  // the idler sits where both centre distances are right: circles about the crank gear and the MGU-K gear
  M.idler = (() => {
    const P1 = [0, 14], P3 = [-19.5, 11.0];
    const d12 = M.pr(M.mgukGear[0]) + M.pr(M.mgukGear[1]), d23 = M.pr(M.mgukGear[1]) + M.pr(M.mgukGear[2]);
    const dy = P3[0] - P1[0], dz = P3[1] - P1[1], d13 = Math.hypot(dy, dz);
    const a = (d13 * d13 + d12 * d12 - d23 * d23) / (2 * d13), h = Math.sqrt(Math.max(0, d12 * d12 - a * a));
    const uy = dy / d13, uz = dz / d13;
    return [P1[0] + a * uy + h * uz, P1[1] + a * uz - h * uy];
  })();

  const ENG = [-92, 0, 14], REF = 5;          // engine origin (crank axis) and the reference plane
  const KY = -19.5, KZ = 11.0, GX = -70.6;    // MGU-K axis, and the x of the gear train
  const state = { rpm: 10500, kph: 280, stage: 0, labels: true, flow: false, fire: true, style: location.hash === "#line" ? "line" : "real" };
  let F = null;

  function start() {
    if (F) F.dispose();
    F = new mech.Figure("#fig", { theme: document.documentElement.dataset.theme || "dark", style: state.style, width: 760, height: 480, azimuth: 38, elevation: 24 });
    const REAL = state.style === "real";

    // ---------- facts ----------
    const FIA = "https://www.fia.com/sites/default/files/fia_2026_formula_1_technical_regulations_pu_-_issue_2_-_2023-03-03.pdf";
    const PU26 = "https://www.formula1.com/en/latest/article/2026-regulations-explained-all-you-need-to-know-about-f1s-new-power-units.14jfv7a36905uDJDdNyfQd";
    const RULES = "https://www.formula1.com/en/latest/article/from-smaller-cars-to-a-bigger-budget-cap-12-rule-changes-you-need-to-know-about-in.56uUTFhB0z5j3iZfhC0rGP";
    const CHASSIS = "https://www.formula1.com/en/latest/article/fia-unveils-formula-1-regulations-for-2026-and-beyond-featuring-more-agile.75qJiYOHXgeJqsVQtDr2UB";
    const MSM = "https://www.motorsportmagazine.com/articles/single-seaters/f1/all-the-key-aspects-changing-on-f1s-2026-engines";
    F.facts([
      { id: "cap", claim: "The engine is 1600 cc, with six cylinders of equal size in a 90 degree V.", status: "sourced", source: "FIA 2026 F1 Power Unit Technical Regulations, 5.3.2 and 5.3.3", url: FIA },
      { id: "bore", claim: "The bore is 80 mm.", status: "sourced", source: "FIA 2026 PU Regulations, 5.6.1", url: FIA },
      { id: "crankz", claim: "The crankshaft centre line sits 90 mm above the reference plane.", status: "sourced", source: "FIA 2026 PU Regulations, 5.6.5", url: FIA },
      { id: "stroke", claim: "The stroke is 53.1 mm. It follows from the bore and the capacity.", status: "model" },
      { id: "valves", claim: "Each cylinder has two inlet and two exhaust valves, so 24 in all.", status: "sourced", source: "FIA 2026 PU Regulations, 5.3.4", url: FIA },
      { id: "springs", claim: "Air springs close the valves.", status: "sourced", source: "FIA 2026 PU Regulations, Appendix 3 Table 1, item 1", url: FIA },
      { id: "rpm", claim: "The engine turns up to 15,000 rpm.", status: "sourced", source: "Motor Sport Magazine, 2026 engine table", url: MSM },
      { id: "ef", claim: "Fuel energy flow may not exceed 3000 MJ/h. Below 10,500 rpm the limit is 0.27 times rpm plus 165.", status: "sourced", source: "FIA 2026 PU Regulations, 5.4.3 and 5.4.4", url: FIA },
      { id: "eta", claim: "48 per cent of the fuel energy becomes work at the crankshaft.", status: "assumed", source: "A typical value for this engine. Teams quote more than 50 per cent." },
      { id: "ice", claim: "The engine makes about 400 kW.", status: "sourced", source: "Formula1.com, 12 rule changes for 2026", url: RULES },
      { id: "icemass", claim: "The engine must weigh at least 130 kg.", status: "sourced", source: "FIA 2026 PU Regulations, 5.7.1", url: FIA },
      { id: "turbo", claim: "One single stage compressor and one single stage turbine, up to 150,000 rpm.", status: "sourced", source: "FIA 2026 PU Regulations, 5.5.1 and 5.5.6", url: FIA },
      { id: "turbomass", claim: "The turbocharger must weigh at least 12 kg.", status: "sourced", source: "FIA 2026 PU Regulations, 5.5.4", url: FIA },
      { id: "mguk", claim: "The MGU-K gives 350 kW, up from 120 kW before 2026.", status: "sourced", source: "Formula1.com, all you need to know about the new power units", url: PU26 },
      { id: "taper", claim: "Above 300 km/h the electric power falls: 1850 minus 5 times the speed in km/h, and 150 kW at 340 km/h and above.", status: "sourced", source: "FIA 2026 PU Regulations, 5.4.7", url: FIA },
      { id: "mgukmass", claim: "The MGU-K must weigh at least 16 kg.", status: "sourced", source: "FIA 2026 PU Regulations, 5.20.7", url: FIA },
      { id: "mgukfix", claim: "The MGU-K must be fixed to the survival cell or to the engine.", status: "sourced", source: "FIA 2026 PU Regulations, 5.20.1", url: FIA },
      { id: "mguh", claim: "The MGU-H, which took energy from the exhaust, is gone for 2026.", status: "sourced", source: "Formula1.com, all you need to know about the new power units", url: PU26 },
      { id: "es", claim: "The charge in the battery may swing by 4 MJ.", status: "sourced", source: "FIA 2026 PU Regulations, 5.4.8", url: FIA },
      { id: "perlap", claim: "The car may recover 9 MJ a lap.", status: "sourced", source: "FIA 2026 PU Regulations, 5.4.9", url: FIA },
      { id: "esmass", claim: "The battery enclosure must weigh at least 35 kg.", status: "sourced", source: "FIA 2026 PU Regulations, 5.19.9", url: FIA },
      { id: "split", claim: "Combustion and electric power are now about half each. Electric power was about 20 per cent.", status: "sourced", source: "Formula1.com, all you need to know about the new power units", url: PU26 },
      { id: "fuel", claim: "Every team runs advanced sustainable fuel, made from captured carbon, waste or non-food biomass, and certified by an independent body.", status: "sourced", source: "Formula1.com, all you need to know about the new power units", url: PU26 },
      { id: "layout", claim: "The exhaust ports face into the V and the turbocharger sits at the rear of the engine. A rear turbo keeps the turbine heat away from the inlet side.", status: "assumed", source: "The usual layout for these engines. Car Magazine, how an F1 hybrid engine works.", url: "https://carmagazine.co.uk/hybrid/how-f1-engine-works" },
      { id: "dims", claim: "Wheelbase at most 3400 mm, width 1900 mm, and the car weighs at least 768 kg.", status: "sourced", source: "Formula1.com, FIA unveils the 2026 regulations", url: CHASSIS },
      { id: "firing", claim: "The six cylinders fire 120 degrees apart. Split crank pins, 30 degrees apart, make the interval even in a 90 degree V.", status: "model" },
      { id: "gears", claim: "The gear ratio from the crankshaft to the MGU-K.", status: "illustrative" },
      { id: "timing", claim: "Valve timing and valve lift.", status: "illustrative" },
      { id: "shell", claim: "The bodywork, the wings, the floor, the gearbox shape and the road.", status: "illustrative" },
      { id: "wheelr", claim: "The wheel is about 720 mm across, on an 18 inch rim.", status: "assumed", source: "A typical value for these cars." },
    ]);

    // ---------- 1. the car: an original, generic shell ----------
    const FA = 170, RA = -170, WR = 36;        // front axle, rear axle, wheel radius
    const car = { tag: "car" }, body = { tag: "body" };
    const wheels = [];
    const roadway = F.road({ length: 820, width: 360, x: -20, pitch: M.kerb });   // scrolls under the car, which stays put
    const off = (pts, y0) => pts.map(([y, z]) => [y + y0, z]);
    const bodyKeys = [[248, 7, 11, 19, 3], [232, 10, 9, 23, 3], [206, 15, 8, 29, 3.2], [168, 21, 7, 36, 3.4], [130, 27, 6, 44, 4], [86, 31, 6, 52, 4.4], [34, 33, 6, 58, 5], [-6, 33, 6, 60, 5], [-50, 32, 7, 59, 4.8], [-92, 30, 8, 58, 4.6], [-130, 22, 9, 48, 4], [-162, 14, 11, 38, 3.6], [-188, 8, 13, 28, 3]];
    const bodySec = mech.sweep(bodyKeys, 96).map(([x, W, zb, zt, e]) => ({ x, pts: mech.superSection(W, zb, zt, e, 56) }));
    const isOpen = (i, j, n, x) => { const a = ((j + 0.5) / n) * 360; return x < 112 && x > 8 && a > 40 && a < 140; };   // cockpit opening
    F.add(mech.loftGeo(bodySec, { filter: (i, j, n, x) => !isOpen(i, j, n, x) }), { mat: "paint", side: "double", ...body, edges: 34 });
    // sidepods, one each side
    const podKeys = [[4, 8, 15, 35, 3], [-20, 17, 11, 41, 3.4], [-52, 20, 9, 40, 3.6], [-84, 15, 8, 32, 3.2], [-106, 7, 8, 22, 3]];
    for (const s of [-1, 1]) {
      const sec = mech.sweep(podKeys, 56).map(([x, W, zb, zt, e]) => ({ x, pts: off(mech.superSection(W, zb, zt, e, 40), s * 64) }));
      F.add(mech.loftGeo(sec), { mat: "paint", side: "double", ...body, edges: 34 });
      F.box({ w: 2, d: 22, h: 20, r: 5 }, { mat: "plastic", at: [4, s * 64, 14], ...body, info: "sidepod" });                 // inlet mouth
    }
    // floor and diffuser
    F.plate({ w: 300, d: 142, h: 2.4, holes: [] }, { mat: "plastic", at: [-26, 0, REF - 2.4], ...car, info: "floor" });
    F.box({ w: 54, d: 130, h: 2.2, r: 6 }, { mat: "plastic", at: [-152, 0, REF - 1], rot: [0, -0.2, 0], ...car, info: "floor" });   // diffuser ramp
    for (const s of [-1, 1]) F.box({ w: 300, d: 3, h: 7, r: 1.4 }, { mat: "plastic", at: [-26, s * 69, REF], ...car, info: "floor", edges: false });
    // front wing
    for (const [dx, dz, w, flap] of [[0, 0, 13, 0], [9, 3.2, 11, 1], [17, 6.4, 9, 1], [24, 9.6, 7, 1]]) {
      F.box({ w, d: 176, h: 1.6, r: 0.8 }, { mat: "plastic", at: [238 - dx, 0, 11 + dz], rot: [0, -0.12 - flap * 0.05, 0], ...car, info: "frontWing", edges: false });
    }
    for (const s of [-1, 1]) F.box({ w: 34, d: 2, h: 16, r: 3 }, { mat: "plastic", at: [228, s * 88, 12], ...car, info: "frontWing" });
    F.lathe([[0, 0], [9, 2], [11, 7], [11, 14], [8, 17]], { axis: "x", n: 28 }, { mat: "paint", at: [236, 0, 12], rot: [0, 0, Math.PI], ...body, info: "nose", side: "double" });
    // rear wing, beam wing, crash structure
    for (const [dx, dz, w] of [[0, 0, 18], [13, 7, 14], [24, 13, 10]]) F.box({ w, d: 104, h: 1.8, r: 0.9 }, { mat: "plastic", at: [-222 - dx, 0, 72 + dz], rot: [0, -0.16, 0], ...car, info: "rearWing", edges: false });
    for (const s of [-1, 1]) F.box({ w: 46, d: 2.2, h: 30, r: 4 }, { mat: "plastic", at: [-234, s * 52, 66], ...car, info: "rearWing" });
    F.box({ w: 30, d: 104, h: 1.8, r: 0.9 }, { mat: "plastic", at: [-222, 0, 40], rot: [0, -0.1, 0], ...car, info: "rearWing", edges: false });
    F.lathe([[0, 0], [7, 1], [8, 5], [8, 30], [6, 34]], { axis: "x", n: 24 }, { mat: "paint", at: [-190, 0, 20], rot: [0, 0, Math.PI], ...body, side: "double" });
    for (const s of [-1, 1]) F.box({ w: 34, d: 3, h: 58, r: 3 }, { mat: "plastic", at: [-204, s * 50, 38], ...car, info: "rearWing" });   // endplate support
    // halo, headrest, helmet
    const halo = F.group({ at: [62, 0, 56], rot: [0, -0.1, 0] });
    const hoop = F.torus({ R: 26, r: 2.2, n: 44, axis: "z" }, { mat: "darkSteel", at: [0, 0, 8], group: halo, tag: "car", info: "halo" });
    hoop.scale.set(1.45, 1, 1);
    F.cyl({ r: 2.2, h: 9, n: 14 }, { mat: "darkSteel", at: [38, 0, 0], group: halo, tag: "car", info: "halo" });
    for (const s of [-1, 1]) F.cyl({ r: 2, h: 10, n: 12 }, { mat: "darkSteel", at: [-36, s * 23, -1], rot: [0, 0.25, 0], group: halo, tag: "car", info: "halo" });
    F.box({ w: 22, d: 40, h: 12, r: 5 }, { mat: "rubber", at: [16, 0, 52], ...car });
    F.lathe([[0, 13], [8, 12.6], [12, 9], [13, 0]], { n: 28 }, { mat: "paint", at: [46, 0, 54], ...car });
    // airbox over the driver's head, feeding the compressor
    F.lathe([[0, 0], [9, 1.5], [11, 7], [11, 20], [9, 24]], { axis: "x", n: 28 }, { mat: "paint", at: [8, 0, 84], rot: [0, 0, Math.PI], ...body, info: "airbox", side: "double" });
    F.box({ w: 26, d: 20, h: 30, r: 7 }, { mat: "paint", at: [-14, 0, 60], ...body });
    // wheels
    for (const [x, hw] of [[FA, 17], [RA, 19]]) for (const s of [-1, 1]) {
      const W = F.group({ at: [x, s * (95 - hw), WR] });          // turns with the road
      const U = F.group({ at: [x, s * (95 - hw), WR] });          // upright: stays still
      wheels.push(W);
      const o = { group: W, tag: "wheel" }, u = { group: U, tag: "wheel" };
      F.lathe([[23, -hw], [31, -hw], [35, -hw + 3], [WR, -hw + 8], [WR, hw - 8], [35, hw - 3], [31, hw], [23, hw]], { axis: "y", n: 44 }, { mat: "rubber", ...o, info: "wheel" });
      F.lathe([[22.9, -hw + 2], [22.9, hw - 3], [23.8, hw - 2], [23.8, hw - 4], [21.4, hw - 4.4], [21.4, -hw + 2]], { axis: "y", n: 40 }, { mat: "darkSteel", ...o });
      F.cyl({ r: 15, h: 2.6, n: 32, axis: "y" }, { mat: "steel", at: [0, s * 2, 0], ...o, info: "brake" });
      F.box({ w: 11, d: 5, h: 7, r: 2 }, { color: 0xc8372f, at: [-10, s * 2, 7], ...u, edges: false });
      for (let k = 0; k < 9; k++) F.box({ w: 2, d: 1.8, h: 20, r: 0.7 }, { mat: "machined", at: [0, s * (hw - 7), 0], rot: [0, k * 40 * D + (k % 2 ? 0.1 : -0.1), 0], ...o, edges: false, shadow: false });
      F.lathe([[0, 2.2], [4, 1.8], [5.6, 0], [5.6, -2]], { axis: "y", n: 22 }, { mat: "darkSteel", at: [0, s * (hw - 7), 0], rot: [s > 0 ? 0 : Math.PI, 0, 0], ...o });
      F.lathe([[8, 0], [20, 0], [20, 2], [8, 2]], { axis: "y", n: 32 }, { mat: "plastic", at: [0, s * (hw - 3), 0], rot: [s > 0 ? 0 : Math.PI, 0, 0], ...u, side: "double", edges: false });   // wheel cover, fixed
    }
    // suspension
    for (const [x, zc, inb] of [[FA, 22, 128], [RA, 24, -126]]) for (const s of [-1, 1]) {
      for (const dz of [0, 18]) { F.tube([[inb, s * 20, zc + dz * 0.4], [x + (x > 0 ? 6 : -6), s * 62, zc + dz]], 1.8, { mat: "darkSteel", ...car, info: "suspension" }); F.tube([[inb + (x > 0 ? -22 : 22), s * 20, zc + dz * 0.4], [x + (x > 0 ? 6 : -6), s * 62, zc + dz]], 1.8, { mat: "darkSteel", ...car, info: "suspension" }); }
      F.tube([[x + (x > 0 ? 4 : -4), s * 58, zc + 2], [inb + (x > 0 ? -10 : 10), s * 16, zc + 30]], 1.6, { mat: "darkSteel", ...car, info: "suspension" });
      F.tube([[x + (x > 0 ? 6 : -6), s * 62, zc + 9], [x + (x > 0 ? 6 : -6), s * 76, zc + 9]], 2.4, { mat: "steel", ...car });   // upright to hub
    }
    // fuel cell and gearbox
    const mount = { tag: "mount" };
    F.box({ w: 44, d: 42, h: 24, r: 5 }, { mat: "plastic", at: [-54, 0, 21], ...mount, info: "fuel" });
    F.box({ w: 48, d: 30, h: 26, r: 6 }, { mat: "castAl", at: [-168, 0, 8], ...mount, info: "gearbox" });
    for (let i = 0; i < 5; i++) F.box({ w: 1.2, d: 31.4, h: 27, r: 6 }, { mat: "castAl", at: [-160 + i * 9, 0, 7.5], ...mount, edges: false });
    F.lathe([[0, 0], [13, 0], [15, 3], [15, 10], [13, 13]], { axis: "x", n: 36 }, { mat: "castAl", at: [-120, 0, 14], rot: [0, 0, Math.PI], ...mount, info: "gearbox" });   // bell housing
    for (const s of [-1, 1]) F.cyl({ r: 2.6, h: 52, n: 16, axis: "y" }, { mat: "steel", at: [RA, s * 24, 20], ...car });

    // ---------- 2. the power unit ----------
    const E = F.group({ at: ENG, info: "ice" });
    const ice = (o) => ({ group: E, tag: "ice", ...o });
    const crankcase = F.box({ w: 38, d: 22, h: 13.5, r: 2 }, ice({ mat: "castAl", at: [0, 0, -7.5], info: "block" }));         // crankcase
    F.box({ w: 34, d: 18, h: 1.6, r: 2 }, ice({ mat: "darkSteel", at: [0, 0, -9], info: "sump" }));                          // sump, at the reference plane
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) F.box({ w: 1, d: 1.2, h: 11, r: 0.3 }, ice({ mat: "castAl", at: [-16 + i * 8, s * 11.4, -6], edges: false }));
    F.box({ w: 2.4, d: 24, h: 16, r: 3 }, ice({ mat: "castAl", at: [20, 0, -7], info: "geartrain" }));                       // front gear case
    F.box({ w: 2.4, d: 22, h: 14, r: 3 }, ice({ mat: "castAl", at: [-20, 0, -6], info: "block" }));                          // rear face
    const bp = (b, x, y, z) => { const a = -M.bank[b], c = Math.cos(a), si = Math.sin(a); return [x, y * c - z * si, y * si + z * c]; };   // bank local to engine frame
    const cylX = (c) => (1 - M.station[c]) * M.spacing;
    const cyls = [], cams = [], banks = [];
    [0, 1].forEach((b) => {
      const sgn = b ? 1 : -1;                                  // sgn * y is outboard in this bank
      const B = F.group({ group: E, rot: [-M.bank[b], 0, 0] }); banks.push(B);
      const bk = (o) => ({ group: B, tag: "ice", ...o });
      F.box({ w: 34, d: 11, h: 14, r: 1 }, bk({ mat: "castAl", at: [0, 0, 3], info: "block" }));                             // cylinder bank
      F.box({ w: 34, d: 13, h: 7, r: 1.4 }, bk({ mat: "castAl", at: [0, 0, 17], info: "head" }));                            // cylinder head
      F.screws([-15, -5, 5, 15].flatMap((x) => [[x, 6, 24], [x, -6, 24]]), 0.5, bk({ mat: "steel" }));
      F.box({ w: 33, d: 12, h: 3, r: 3 }, bk({ mat: "castAl", at: [0, 0, 24], info: "cover" }));                             // cam cover
      F.tube([[-15, sgn * 9, 22], [15, sgn * 9, 22]], 0.7, bk({ mat: "steel", info: "injector" }));                          // fuel rail
      F.box({ w: 30, d: 2.6, h: 2, r: 0.8 }, bk({ mat: "plastic", at: [0, -sgn * 4.4, 27], info: "coilrail", edges: false }));
      const cam = [1, -1].map((side) => {                                                                                    // side 1 = inlet (outboard), -1 = exhaust (inboard)
        const G = F.group({ group: B, at: [0, side * sgn * 2.7, 25.3], info: "cam" });
        F.cyl({ r: 0.8, h: 32, n: 14, axis: "x" }, { mat: "steel", at: [-16, 0, 0], group: G, tag: "valve", edges: false });
        return G;
      });
      cams.push(...cam);
      for (const c of [1, 2, 3].map((k) => k + b * 3)) {
        const x = cylX(c);
        F.cyl({ r: 0.7, h: 2.4, n: 10 }, bk({ mat: "brass", at: [x, sgn * 7.4, 19.6], rot: [sgn * 0.5, 0, 0], info: "injector", edges: false }));
        F.lathe([[0, 0], [1.5, 0], [1.5, 2.4], [1.1, 3.2], [0, 3.2]], { n: 14 }, bk({ mat: "plastic", at: [x, 0, 27], info: "coil" }));
        const led = F.led([x, 0, 30.4], 0.65, { group: B, color: 0xffa033, tag: "ice" });
        const piston = F.lathe([[0, 4.6], [3.95, 4.6], [4.0, 4.2], [4.0, 0], [3.3, 0], [3.3, 3.2], [0, 3.2]], { n: 32 }, { mat: "machined", at: [x, 0, 0], group: B, tag: "moving", info: "piston" });
        for (const z of [3.0, 3.7]) F.torus({ R: 4.01, r: 0.1, n: 32 }, { mat: "darkSteel", at: [0, 0, z], group: piston, tag: "moving", shadow: false });
        const rod = F.box({ w: 1.5, d: 2.4, h: M.rod, r: 0.5 }, { mat: "steel", at: [x, 0, 0], group: B, tag: "moving", info: "rod" });
        F.cyl({ r: 3.0, h: 1.5, n: 20, axis: "x" }, { mat: "steel", at: [-0.75, 0, 0], group: rod, tag: "moving", edges: false });
        const fire = F.cyl({ r: 3.8, h: 1.2, n: 24 }, { color: 0xffa033, at: [x, 0, 15.6], group: B, tag: "fire", edges: false, shadow: false });
        fire.material.emissive.set(0xff7a1a); fire.visible = false;
        const valves = [];
        for (const side of [1, -1]) for (const dx of [-1.9, 1.9]) {
          const inlet = side === 1, R = inlet ? 1.55 : 1.3;
          const v = F.lathe([[0, 0], [R, 0], [R, 0.25], [0.3, 1.2], [0.3, 8.3], [0, 8.3]], { n: 14 }, { mat: "machined", at: [x + dx, side * sgn * 2.7, 17], group: B, tag: "valve", edges: false, shadow: false, info: inlet ? "inletValve" : "exhaustValve" });
          valves.push({ v, inlet });
          const phi = (180 - (M.fireAt[c] + (inlet ? M.valve.intake : M.valve.exhaust)) / 2) * D;
          F.cyl({ r: 1.05, h: 1.3, n: 14, axis: "x" }, { mat: "machined", at: [x + dx - 0.65, 0.4 * Math.sin(phi), 0.4 * Math.cos(phi)], group: cam[inlet ? 0 : 1], tag: "valve", edges: false, shadow: false });
          F.cyl({ r: 0.62, h: 1.6, n: 12 }, { mat: "darkSteel", at: [x + dx, side * sgn * 2.7, 22.4], group: B, tag: "valve", edges: false, shadow: false, info: "spring" });   // air spring cap
        }
        cyls.push({ c, x, b, sgn, piston, rod, fire, led, valves });
      }
    });
    // crankshaft with split pins
    const crank = F.group({ group: E, info: "crank" });
    const mv = (o) => ({ group: crank, tag: "moving", ...o });
    F.cyl({ r: 2.6, h: 44, n: 24, axis: "x" }, mv({ mat: "steel", at: [-22, 0, 0] }));
    for (const st of [0, 1, 2]) {
      const x0 = (1 - st) * M.spacing;
      const pair = [1, 2, 3, 4, 5, 6].filter((c) => M.station[c] === st);
      pair.forEach((c, k) => {
        const phi = M.pin[c] * D, py = M.r * Math.sin(phi), pz = M.r * Math.cos(phi), jx = x0 + (k ? 1.4 : -1.4);
        F.cyl({ r: 2.3, h: 2.6, n: 18, axis: "x" }, mv({ mat: "machined", at: [jx - 1.3, py, pz] }));
        F.lathe([[0, 0], [5.6, 0], [6.1, 0.25], [6.1, 0.8], [5.6, 1], [0, 1]], { axis: "x", n: 28 }, mv({ mat: "steel", at: [jx + (k ? 1.3 : -2.3), -py * 0.5, -pz * 0.5] }));
      });
    }
    F.lathe([[0, 0], [11, 0], [12.4, 0.4], [12.4, 2.2], [11, 2.6], [0, 2.6]], { axis: "x", n: 40 }, mv({ mat: "steel", at: [-22.6, 0, 0], info: "clutch" }));
    const crankGear = F.gear({ teeth: M.mgukGear[0], pitch: M.pitch, thick: 2.2, hole: 2.6, axis: "x" }, { mat: "machined", at: [GX - ENG[0], 0, 0], group: crank, tag: "moving", info: "geartrain" });
    // MGU-K, low on the left of the engine, geared to the crankshaft
    const K = F.group({ at: [-70, KY, KZ], info: "mguk" });
    const kg = (o) => ({ group: K, tag: "ers", ...o });
    F.lathe([[0, -10], [4.2, -10], [5.2, -8.6], [5.2, 8.6], [4.2, 10], [0, 10]], { axis: "x", n: 32 }, kg({ mat: "castAl", info: "mguk" }));
    for (let i = 0; i < 8; i++) F.box({ w: 0.9, d: 1, h: 10, r: 0.3 }, kg({ mat: "castAl", at: [-8 + i * 2.3, 0, 0], rot: [0.35, 0, 0], edges: false }));
    const rotor = F.cyl({ r: 3.2, h: 12, n: 24, axis: "x" }, kg({ mat: "machined", at: [-6, 0, 0], info: "rotor" }));
    F.box({ w: 2, d: 6.5, h: 6.5, r: 2 }, kg({ mat: "plastic", at: [-11, 0, 0], info: "cables" }));
    for (const x of [-78, -66]) F.box({ w: 4, d: 6, h: 5, r: 1 }, { mat: "castAl", at: [x, KY + 7.5, KZ], tag: "ers", edges: false });   // mounts to the engine
    for (const dy of [-1.6, 0, 1.6]) F.tube([[-82, KY + dy, KZ + 2], [-68, KY + dy + 3, 19], [-52, KY + dy + 7, 22], [-42, KY + dy + 11, 21]], 0.8, { mat: "rubber", tag: "ers", info: "cables" });
    const mgukGear = F.gear({ teeth: M.mgukGear[2], pitch: M.pitch, thick: 2.2, hole: 1.4, axis: "x" }, { mat: "machined", at: [GX, KY, KZ], tag: "ers", info: "geartrain" });
    const idler = F.gear({ teeth: M.mgukGear[1], pitch: M.pitch, thick: 2.2, hole: 1.8, axis: "x" }, { mat: "machined", at: [GX, M.idler[0], M.idler[1]], tag: "ice", info: "geartrain" });
    // energy store and control electronics, inside the survival cell
    F.box({ w: 32, d: 34, h: 13, r: 3 }, { mat: "castAl", at: [-38, 0, REF + 1], tag: "ers", info: "es" });
    for (let i = 0; i < 6; i++) F.box({ w: 4, d: 30, h: 9, r: 1 }, { mat: "darkSteel", at: [-51 + i * 5.2, 0, REF + 2], tag: "ers", edges: false, info: "es" });
    F.fins(7, { x: -38, y: 0, z: REF + 14, w: 1, d: 28, h: 1.6, gap: 4 }, { mat: "castAl", tag: "ers", edges: false, info: "es" });
    F.box({ w: 18, d: 20, h: 6, r: 2 }, { mat: "plastic", at: [-36, 0, REF + 15], tag: "ers", info: "ce" });
    F.screws([[-29, 7, REF + 21], [-29, -7, REF + 21], [-43, 7, REF + 21], [-43, -7, REF + 21]], 0.5, { mat: "steel", tag: "ers" });
    // intake: plenum above the V, runners arching over the cam covers
    const pipe = { tag: "pipes" };
    F.box({ w: 34, d: 46, h: 7, r: 4 }, { mat: "plastic", at: [ENG[0], 0, ENG[2] + 30], ...pipe, info: "plenum" });
    for (const c of [1, 2, 3, 4, 5, 6]) {
      const b = M.bankOf[c], sg = b ? 1 : -1, x = ENG[0] + cylX(c), p = bp(b, 0, sg * 13, 20.5);
      F.tube([[x, sg * 15, ENG[2] + 30], [x, sg * 23, ENG[2] + 26], [x, sg * 27, ENG[2] + 16], [x, ENG[1] + p[1] * 1.02, ENG[2] + p[2] + 1.5]], 1.9, { mat: "castAl", ...pipe, info: "runner" });
    }
    // exhaust: ports inside the V, collector, turbine, tailpipe
    for (const c of [1, 2, 3, 4, 5, 6]) {
      const b = M.bankOf[c], x = ENG[0] + cylX(c), p = bp(b, 0, (b ? -1 : 1) * 11, 21);
      F.tube([[x, ENG[1] + p[1] * 1.04, ENG[2] + p[2] + 0.6], [x - 4, ENG[1] + p[1] * 0.6, ENG[2] + 20], [ENG[0] - 20, ENG[1] + p[1] * 0.25, ENG[2] + 19]], 1.5, { mat: "iron", ...pipe, info: "exhaust" });
    }
    F.tube([[ENG[0] - 17, 0, ENG[2] + 19], [-116, 0, 34], [-121, 0, 37.6]], 3.2, { mat: "iron", ...pipe, info: "exhaust" });
    F.torus({ R: 3.3, r: 0.4, axis: "x" }, { mat: "chrome", at: [-120, 0, 37.2], ...pipe });
    // turbocharger at the rear of the engine
    const TU = F.group({ at: [-130, 0, 40], info: "turbo" });
    const tu = (o) => ({ group: TU, tag: "turbo", ...o });
    F.lathe([[0, -3], [3.0, -3], [3.4, -2], [2.4, -1], [2.4, 1], [3.4, 2], [3.0, 3], [0, 3]], { axis: "x", n: 22 }, tu({ mat: "castAl" }));
    F.add(mech.voluteGeo({ R: 3.6, r0: 1.2, r1: 2.5 }), tu({ mat: "iron", at: [6.6, 0, 0], rot: [Math.PI * 0.5, 0, 0], edges: false, info: "turbine" }));
    const turbHub = F.lathe([[0, -2.2], [3.4, -2.2], [3.8, -1], [3.8, 1], [3.4, 2.2], [0, 2.2]], { axis: "x", n: 28 }, tu({ mat: "iron", at: [6.6, 0, 0], info: "turbine" }));
    const turbWheel = F.group({ group: TU, at: [4.0, 0, 0] });
    for (let k = 0; k < 11; k++) F.box({ w: 0.5, d: 0.5, h: 2.4 }, { mat: "machined", rot: [k * 32.7 * D, 0.45, 0], group: turbWheel, tag: "turbo", edges: false, shadow: false });
    F.cyl({ r: 0.8, h: 1, n: 10, axis: "x" }, { mat: "machined", at: [-0.3, 0, 0], group: turbWheel, tag: "turbo", edges: false });
    F.add(mech.voluteGeo({ R: 3.8, r0: 1.2, r1: 2.6 }), tu({ mat: "castAl", at: [-6.6, 0, 0], rot: [Math.PI * 0.5, 0, 0], edges: false, info: "compressor" }));
    F.lathe([[0, 0], [3.6, 0], [3.8, 1], [3.4, 2.6], [2.6, 3.2], [2.6, 7], [3.0, 7], [3.0, 7.6], [2.1, 7.6], [2.1, 2.8], [0, 2.4]], { axis: "x", n: 28 }, tu({ mat: "castAl", at: [-6.6, 0, 0], rot: [0, Math.PI, 0], info: "compressor" }));
    const compWheel = F.group({ group: TU, at: [-4.2, 0, 0] });
    for (let k = 0; k < 10; k++) F.box({ w: 0.5, d: 0.5, h: 2.2 }, { mat: "machined", rot: [k * 36 * D, -0.5, 0], group: compWheel, tag: "turbo", edges: false, shadow: false });
    F.cyl({ r: 0.8, h: 1, n: 10, axis: "x" }, { mat: "machined", at: [-0.3, 0, 0], group: compWheel, tag: "turbo", edges: false });
    F.lathe([[0, 0], [1.4, 0.3], [1.4, 4.2], [0.5, 4.8], [0.5, 7.4]], { axis: "z", n: 14 }, tu({ mat: "steel", at: [1.5, -5, 0], rot: [0, 0.3, 0], edges: false, info: "wastegate" }));
    F.torus({ R: 3.5, r: 0.35, axis: "x" }, tu({ mat: "chrome", at: [3.2, 0, 0] }));
    // ducts: airbox to compressor, compressor to intercooler to plenum, turbine to tailpipe
    F.tube([[6, 0, 86], [-24, 0, 80], [-62, 0, 68], [-104, 0, 54], [-134, 0, 46], [-144, 0, 41]], 4, { mat: "plastic", ...pipe, info: "airbox" });
    F.tube([[-137, -5, 44], [-128, -26, 40], [-106, -50, 32], [-82, -62, 26]], 3.2, { mat: "castAl", ...pipe, info: "chargePipe" });
    F.box({ w: 36, d: 15, h: 24, r: 3 }, { mat: "steel", at: [-64, -66, 14], ...pipe, info: "intercooler" });
    for (let i = 0; i < 16; i++) F.box({ w: 32, d: 0.7, h: 20 }, { mat: "darkSteel", at: [-64, -72.5 + i * 0.9, 16], ...pipe, edges: false, shadow: false });
    F.box({ w: 40, d: 15, h: 26, r: 3 }, { mat: "steel", at: [-54, 66, 16], ...car, info: "radiator" });
    for (let i = 0; i < 16; i++) F.box({ w: 36, d: 0.7, h: 22 }, { mat: "darkSteel", at: [-54, 59.5 + i * 0.9, 18], ...car, edges: false, shadow: false });
    F.tube([[-46, -64, 28], [-62, -48, 40], [-80, -28, 45], [-90, -14, 42]], 3.2, { mat: "castAl", ...pipe, info: "chargePipe" });
    F.tube([[-137, 4, 44], [-150, 2, 42], [-172, 1, 40], [-192, 0, 38]], 3.4, { mat: "iron", ...pipe, info: "tailpipe" });
    F.lathe([[3.6, 0], [4.2, 0], [4.2, 6], [3.6, 6]], { axis: "x", n: 26 }, { mat: "chrome", at: [-198, 0, 38], ...pipe, info: "tailpipe" });
    F.flow([[8, 0, 88], [-24, 0, 80], [-62, 0, 68], [-104, 0, 54], [-140, 0, 43], [-137, -5, 44], [-128, -26, 40], [-104, -52, 32], [-82, -62, 26], [-64, -66, 20], [-46, -64, 28], [-62, -48, 40], [-80, -28, 46], [-92, -8, 44], [-92, -23, 30], [-92, -26, 22]], { color: 0x4aa8ff, count: 16, speed: 0.26, r: 1.4, set: "pu" });
    F.flow([[-92, -7, 36], [-112, -3, 33], [-123, 0, 40], [-150, 2, 42], [-180, 0, 39], [-200, 0, 38]], { color: 0xff8a2a, count: 9, speed: 0.34, r: 1.4, set: "pu" });

    // ---------- 3. what each part is ----------
    F.describe({
      ice: { name: "Power unit", what: "The 1600 cc V6 and everything that works with it.", does: "Drives the rear wheels and carries the back of the car.", how: "It bolts to the back of the survival cell, and the gearbox bolts to it.", fact: "At least 130 kg, with six cylinders in a 90 degree V.", src: ["cap", "icemass"] },
      block: { name: "Cylinder block", what: "The aluminium case that holds the six cylinders and the crankshaft.", does: "Takes the push of the pistons and keeps the parts in line.", how: "Two banks of three cylinders stand 90 degrees apart over one crankshaft.", fact: "80 mm bore, 53.1 mm stroke, 1600 cc.", src: ["bore", "stroke", "cap"] },
      head: { name: "Cylinder head", what: "The casting that closes the top of each bank of cylinders.", does: "Holds the valves, the camshafts, the injector and the spark plug.", how: "The inlet ports face outwards and the exhaust ports face into the V.", fact: "Two inlet and two exhaust valves per cylinder, 24 in all.", src: ["valves", "layout"] },
      cover: { name: "Cam cover", what: "A light lid over the camshafts.", does: "Seals the top of the head and keeps the oil in." },
      piston: { name: "Piston", what: "The round part that slides in the cylinder.", does: "Burning gas pushes it down. That push is the power of the engine.", how: "It travels 53.1 mm between its highest and lowest point.", fact: "80 mm across, 53.1 mm of travel.", src: ["bore", "stroke"] },
      rod: { name: "Connecting rod", what: "The bar between the piston and the crankshaft.", does: "Turns the up and down push into rotation.", how: "Its small end swings with the piston and its big end runs round a crank journal." },
      crank: { name: "Crankshaft", what: "The shaft along the bottom of the engine.", does: "Collects the push of all six pistons into one turning shaft.", how: "Three pin stations sit 120 degrees apart. Each one carries two journals, split 30 degrees, so the cylinders fire at even intervals.", fact: "Its centre line is 90 mm above the reference plane.", src: ["crankz", "firing"] },
      clutch: { name: "Clutch", what: "A stack of discs on the back of the crankshaft.", does: "Joins the engine to the gearbox, and lets it go for a start or a gearshift." },
      cam: { name: "Camshaft", what: "A shaft with one lobe above each valve.", does: "Pushes the valves open at the right moment.", how: "It turns at half crankshaft speed, so each valve opens once in two turns.", fact: "Four camshafts, two per bank.", src: "valves" },
      inletValve: { name: "Inlet valve", what: "A valve in the outer side of the chamber.", does: "Opens to let compressed air into the cylinder.", how: "The camshaft pushes it down, and an air spring pushes it back shut.", src: ["valves", "springs"] },
      exhaustValve: { name: "Exhaust valve", what: "A valve in the side of the chamber that faces into the V.", does: "Opens to let the burnt gas out towards the turbine.", how: "The camshaft pushes it down, and an air spring pushes it back shut.", src: ["valves", "springs"] },
      spring: { name: "Air spring", what: "A sealed cap of compressed air on top of each valve stem.", does: "Shuts the valve again after the cam lobe passes.", how: "Air pushes the valve back faster than a steel spring can at 15,000 rpm.", src: ["springs", "rpm"] },
      injector: { name: "Fuel injector", what: "A nozzle in the head, fed by the rail beside it.", does: "Sprays the fuel straight into the cylinder.", how: "The fuel is an advanced sustainable fuel, made from captured carbon, waste or non-food biomass.", fact: "Fuel energy flow is capped at 3000 MJ/h.", src: ["fuel", "ef"] },
      coil: { name: "Ignition coil", what: "A coil on top of the cam cover, above the spark plug.", does: "Makes the high voltage that lights the mixture.", how: "It fires at the top of the compression stroke. The flash in the figure marks it." },
      coilrail: { name: "Coil harness", what: "The loom along the cam cover.", does: "Carries the signal to each ignition coil." },
      geartrain: { name: "Gear train", what: "Gears on the front of the crankshaft.", does: "Drives the MGU-K, and the oil and water pumps.", how: "The MGU-K gear is smaller, so the motor turns faster than the engine.", src: "gears" },
      sump: { name: "Sump", what: "A shallow tray on the bottom of the crankcase.", does: "Collects the oil. It is flat because the floor of the car is right below it.", how: "A pump keeps the oil moving, so the tray can be shallow.", fact: "The crankshaft sits only 90 mm above the reference plane.", src: "crankz" },
      plenum: { name: "Plenum", what: "A sealed box above the V.", does: "Holds a store of compressed air for the six cylinders to draw on.", how: "The turbocharger fills it, and each cylinder takes what it needs through its own runner." },
      runner: { name: "Inlet runner", what: "One curved pipe for each cylinder.", does: "Carries air from the plenum to the inlet port.", how: "It arches over the cam cover, because the inlet port faces outwards and down." },
      exhaust: { name: "Exhaust", what: "Six pipes inside the V, joined into one collector.", does: "Takes the burnt gas from the cylinders to the turbine.", how: "The ports face into the V, so the path to the turbine is short and stays hot.", src: "layout" },
      turbo: { name: "Turbocharger", what: "One turbine and one compressor on a single shaft.", does: "Uses the exhaust to compress the air going in.", how: "Exhaust spins the turbine, the turbine spins the compressor, and the compressor pushes air to the plenum.", fact: "One single stage of each, up to 150,000 rpm, at least 12 kg.", src: ["turbo", "turbomass", "layout"] },
      turbine: { name: "Turbine", what: "The hot wheel and its scroll, fed by the exhaust collector.", does: "Takes energy out of the exhaust and turns the shaft.", how: "The scroll narrows, so the gas speeds up before it hits the blades.", src: "turbo" },
      compressor: { name: "Compressor", what: "The cold wheel and its scroll, on the other end of the shaft.", does: "Compresses the air from the airbox.", how: "The blades throw air outwards, and the scroll turns that speed into pressure.", src: "turbo" },
      wastegate: { name: "Wastegate", what: "A valve that can let exhaust past the turbine.", does: "Caps the boost by sending gas round the turbine instead of through it." },
      airbox: { name: "Airbox", what: "The inlet over the driver's head and the duct behind it.", does: "Feeds clean air to the compressor.", how: "The car drives into still air, so pressure builds at the mouth of the inlet." },
      chargePipe: { name: "Charge pipe", what: "The pipes between the compressor, the intercooler and the plenum.", does: "Carries the compressed air, which comes out of the compressor hot." },
      intercooler: { name: "Intercooler", what: "A heat exchanger in the right sidepod.", does: "Cools the compressed air before it reaches the cylinders.", how: "Cool air is denser, so more of it fits in the cylinder." },
      tailpipe: { name: "Tailpipe", what: "The pipe from the turbine to the back of the car.", does: "Sends the exhaust out behind the car." },
      mguk: { name: "MGU-K", what: "An electric motor and generator geared to the crankshaft.", does: "Drives the rear wheels with the engine, and charges the battery under braking.", how: "It gives 350 kW now, nearly three times the 120 kW it gave before 2026.", fact: "350 kW, at least 16 kg, fixed to the engine or the survival cell.", src: ["mguk", "mgukmass", "mgukfix"] },
      rotor: { name: "Rotor", what: "The turning part inside the MGU-K.", does: "Makes torque from current, or current from torque.", how: "Which way it works depends on whether the driver is on the throttle or the brake." },
      cables: { name: "Phase cables", what: "Thick shielded cables from the MGU-K to the control electronics.", does: "Carry the current between the motor and the battery." },
      es: { name: "Energy store", what: "The battery, inside the survival cell under the fuel cell.", does: "Holds the energy the MGU-K recovers until the driver uses it.", how: "The rules cap how much charge may come and go, so the driver spends it where it helps most.", fact: "4 MJ of charge swing, 9 MJ recovered a lap, enclosure at least 35 kg.", src: ["es", "perlap", "esmass"] },
      ce: { name: "Control electronics", what: "The box that switches the current.", does: "Decides moment by moment where the energy goes.", how: "It turns the battery's direct current into the alternating current the motor needs, and back again." },
      fuel: { name: "Fuel cell", what: "A rubber bag tank behind the driver, inside the survival cell.", does: "Holds the fuel, in the safest place in the car.", src: "fuel" },
      gearbox: { name: "Gearbox", what: "The case behind the engine, carrying the rear suspension.", does: "Picks the ratio between the power unit and the rear wheels.", src: "shell" },
      floor: { name: "Floor", what: "The flat panel under the car, and the ramp at the back.", does: "Makes most of the downforce by speeding up the air underneath.", src: "shell" },
      frontWing: { name: "Front wing", what: "Four planes and two endplates at the nose.", does: "Makes downforce at the front and sends the air round the front wheels.", src: "shell" },
      rearWing: { name: "Rear wing", what: "Three planes between two endplates, plus the beam wing below.", does: "Makes downforce at the back. In 2026 it also moves, to cut drag on a straight.", src: "shell" },
      nose: { name: "Nose", what: "The crash structure ahead of the survival cell.", does: "Holds the front wing and absorbs a frontal impact." },
      halo: { name: "Halo", what: "A titanium hoop over the cockpit.", does: "Keeps wheels and debris off the driver's head." },
      sidepod: { name: "Sidepod", what: "The bodywork each side of the driver, with its inlet at the front.", does: "Feeds air to the coolers and shapes the flow to the rear of the car." },
      radiator: { name: "Radiator", what: "A heat exchanger in the left sidepod.", does: "Passes heat from the coolant to the air going past." },
      wheel: { name: "Wheel", what: "An 18 inch rim inside a slick tyre.", does: "Puts the power on the road and takes the cornering load.", how: "It rolls without slipping, so one turn carries the car one circumference down the road.", fact: "The car is 1900 mm wide and weighs at least 768 kg.", src: ["dims", "wheelr"] },
      brake: { name: "Brake disc", what: "A carbon disc inside each wheel.", does: "Slows the car, and the MGU-K takes some of that energy back.", how: "Under braking the MGU-K works as a generator, so the discs have less to do.", src: "mguk" },
      suspension: { name: "Suspension", what: "Wishbones, a pushrod and a track rod at each corner.", does: "Holds the wheel in place and feeds the load into the chassis.", src: "shell" },
    });
    F.check("no MGU-H in a 2026 power unit", !("mguh" in F.infoDict));

    // ---------- labels ----------
    F.label("frontWing", { set: "car", on: [238, -70, 12] });
    F.label("halo", { set: "car", on: [60, -29, 70] });
    F.label("sidepod", { set: "car", on: [4, -64, 24] });
    F.label("airbox", { set: "car", on: [0, -9, 88] });
    F.label("rearWing", { set: "car", on: [-230, -30, 80] });
    F.label("floor", { set: "car", on: [-150, -58, 6] });
    F.label("wheel", { set: "car", on: [170, -94, 40] });
    F.label("suspension", { set: "car", on: [-150, -40, 24] });
    F.label("block", { set: "pu", on: [-92, -11.5, 17.5] });
    F.label("plenum", { set: "pu" });
    F.label("turbo", { set: "pu" });
    F.label("mguk", { set: "pu", on: [-70, KY - 5, KZ] });
    F.label("es", { set: "pu" });
    F.label("ce", { set: "pu" });
    F.label("intercooler", { set: "pu" });
    F.label("exhaust", { set: "pu", on: [-116, 0, 34] });
    const c1 = cyls[0];
    F.label("piston", { set: "inside", on: c1.piston });
    F.label("rod", { set: "inside", on: c1.rod, offset: [4, -6, 2] });
    F.label("crank", { set: "inside", on: [-80, 0, 14] });
    F.label("cam", { set: "inside", on: [-104, 19.8, 30] });
    F.label("inletValve", { set: "inside", on: cyls[1].valves[0].v, offset: [0, 0, -4] });
    F.label("exhaustValve", { set: "inside", on: cyls[4].valves[2].v });
    F.label("geartrain", { set: "inside", on: crankGear, offset: [0, -6, 4] });

    // ---------- checks: the model against the facts ----------
    F.check("fuel energy flow reaches the 3000 MJ/h cap at 10,500 rpm", Math.abs(M.ef(10500) - 3000) < 1e-9 && M.ef(10400) < 3000, M.ef(10400).toFixed(0) + " MJ/h at 10,400 rpm");
    F.check("the engine makes about 400 kW at the fuel energy cap", Math.round(M.iceKW(M.rpmMax)) === 400, Math.round(M.iceKW(M.rpmMax)) + " kW");
    F.check("the MGU-K holds 350 kW to 300 km/h, then falls to 150 kW by 340", M.mgukKW(200) === 350 && M.mgukKW(300) === 350 && M.mgukKW(320) === 250 && M.mgukKW(340) === 150, "350 / 350 / 250 / 150 kW at 200 / 300 / 320 / 340 km/h");
    F.check("bore and stroke give 1600 cc", Math.abs(M.cap - 1600) < 1, M.cap.toFixed(1) + " cc, stroke " + (M.stroke * 10).toFixed(1) + " mm");
    F.check("the crankshaft sits 90 mm above the reference plane", Math.abs(ENG[2] - REF - M.crankZ) < 1e-9, (ENG[2] - REF) * 10 + " mm");
    let travel = 0, tdcOk = true, rodOk = true;
    for (const c of [1, 2, 3, 4, 5, 6]) {
      let lo = 1e9, hi = -1e9;
      for (let d = 0; d < 720; d += 0.25) { const { a, s } = M.pistonAt(d * D, c); lo = Math.min(lo, s); hi = Math.max(hi, s); if (Math.abs(Math.hypot(M.r * Math.sin(a), s - M.r * Math.cos(a)) - M.rod) > 1e-6) rodOk = false; }
      travel = Math.max(travel, Math.abs(hi - lo - M.stroke));
      if (Math.abs(M.pistonAt(M.fireAt[c] * D, c).s - (M.r + M.rod)) > 1e-6) tdcOk = false;
    }
    F.check("every piston travels exactly one stroke", travel < 1e-6, "worst error " + travel.toExponential(1) + " cm");
    F.check("the connecting rods never change length", rodOk);
    F.check("every cylinder is at top dead centre when it fires", tdcOk, "order " + M.order.join("-"));
    const gaps = M.order.map((c, i) => (M.fireAt[M.order[(i + 1) % 6]] - M.fireAt[c] + 720) % 720);
    F.check("the six cylinders fire 120 degrees apart", gaps.every((g) => g === 120), gaps.join(", "));
    F.check("each crank station carries two journals split 30 degrees", [0, 1, 2].every((st) => { const p = [1, 2, 3, 4, 5, 6].filter((c) => M.station[c] === st).map((c) => M.pin[c]); return Math.abs(((p[0] - p[1] + 360) % 360) - 30) < 1e-9; }));
    const mid = [0, 1, 2].map((st) => { const p = [1, 2, 3, 4, 5, 6].filter((c) => M.station[c] === st).map((c) => M.pin[c]); return (p[0] + p[1]) / 2; });
    F.check("the crank stations sit 120 degrees apart", mid.every((v, i, a) => i === 0 || [120, 240].includes(Math.round((v - a[i - 1] + 360) % 360))), mid.join(", ") + " degrees");
    F.check("the gear train steps the MGU-K up to " + M.ratio.toFixed(2) + " times engine speed", Math.abs(Math.hypot(M.idler[0], M.idler[1] - 14) - (M.pr(M.mgukGear[0]) + M.pr(M.mgukGear[1]))) < 1e-9 && Math.abs(Math.hypot(M.idler[0] + 19.5, M.idler[1] - 11) - (M.pr(M.mgukGear[1]) + M.pr(M.mgukGear[2]))) < 1e-9, "gears mesh at both centres");
    F.check("24 valves, four per cylinder", cyls.reduce((t, c) => t + c.valves.length, 0) === 24, cyls.reduce((t, c) => t + c.valves.length, 0) + " valves");
    F.check("four camshafts, two per bank", cams.length === 4);
    F.check("six cylinders in two banks of three", cyls.length === 6 && banks.length === 2);
    F.check("the wheels roll on the road without slipping", Math.abs(M.spin(280, WR) * WR - M.cmps(280)) < 1e-9, (M.spin(280, WR) / (2 * Math.PI) / M.slow).toFixed(1) + " wheel turns a second on screen at 280 km/h");
    F.check("the kerb pattern wraps with no join", roadway.wrap === M.wrap, "wraps every " + roadway.wrap + " cm, two blocks");
    F.check("the kerbs stay on the tarmac through a whole wrap", roadway.span[0] >= -roadway.length / 2 && roadway.span[1] <= roadway.length / 2, "kerbs " + roadway.span.join(" to ") + " cm on " + roadway.length + " cm of tarmac");
    F.check("each wheel sits on the road, its axle one radius up", wheels.every((W) => Math.abs(W.position.z - WR) < 1e-9), WR + " cm radius");

    // ---------- running ----------
    let theta = 0;
    F.onFrame((dt) => {
      if (!F.reduced) theta += (state.rpm * 6 * D * dt) / M.slow;
      const cyc = (((theta / D) % 720) + 720) % 720;
      crank.rotation.x = -theta;
      crankGear.rotation.x = -theta;
      idler.rotation.x = (theta * M.mgukGear[0]) / M.mgukGear[1];
      mgukGear.rotation.x = -theta * M.ratio;
      rotor.rotation.x = mgukGear.rotation.x;
      cams.forEach((c) => (c.rotation.x = -(cyc / 2) * D));
      for (const c of cyls) {
        const { a, s } = M.pistonAt(theta, c.c);
        c.piston.position.z = s - 2.3;
        c.rod.position.set(c.x, M.r * Math.sin(a), M.r * Math.cos(a));
        c.rod.rotation.x = Math.atan2(M.r * Math.sin(a), s - M.r * Math.cos(a));
        const d = M.since(c.c, cyc), on = d < 70;
        c.fire.visible = on && state.fire;
        F.setLed(c.led, on);
        for (const k of c.valves) k.v.position.z = 17 - M.lift(d, k.inlet ? M.valve.intake : M.valve.exhaust);
      }
      if (!F.reduced) {
        const step = (M.cmps(state.kph) * dt) / M.slow;
        roadway.move(step);
        for (const W of wheels) W.rotation.y += M.spin(state.kph, WR) * dt / M.slow;
      }
      const spin = (state.rpm / M.rpmMax) * M.turboMax * 6 * D * dt / M.slow;
      turbWheel.rotation.x -= spin; compWheel.rotation.x -= spin;
      const ice = M.iceKW(state.rpm), k = M.mgukKW(state.kph), tot = ice + k;
      F.glow(turbHub, 0.25 + 0.5 * (state.rpm / M.rpmMax), 0xff5a1a);
      F.readout(state.rpm.toLocaleString() + " rpm, fuel energy " + Math.round(M.ef(state.rpm)).toLocaleString() + " MJ/h, V6 " + Math.round(ice) + " kW. " +
        state.kph + " km/h, MGU-K " + Math.round(k) + " kW. Total " + Math.round(tot) + " kW, " + Math.round((k / tot) * 100) + " per cent electric.");
    });

    // ---------- stages ----------
    const SETS = ["car", "pu", "inside"];
    const all = (a) => F.ghost(["car", "body", "mount", "wheel", "road", "ice", "moving", "valve", "turbo", "pipes", "ers", "fire"], a);
    const B3 = (a, b) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b));
    const carBox = B3([-262, -100, 0], [262, 100, 100]), puBox = B3([-148, -46, 0], [-22, 46, 54]), engBox = B3([-124, -30, 0], [-58, 30, 50]);
    const STAGES = [
      { name: "Car", hint: "A 2026 single seater at speed. The power unit sits behind the driver and in front of the gearbox. The Speed slider drives the road. Drag to turn it.",
        go() { all(1); F.shadow(1); F.focus(carBox, { azimuth: 38, elevation: 22 }); } },
      { name: "Power unit", hint: "What it is made of: the V6, the turbocharger, the MGU-K, the battery and the control electronics. There is no MGU-H in 2026.",
        go() { all(1); F.shadow(0.4); F.ghost(["body"], 0.04); F.ghost("car", 0.08); F.ghost("mount", 0.3); F.ghost("wheel", 0.2); F.ghost("road", 0); F.ghost("pipes", 0.36); F.focus(puBox, { azimuth: 36, elevation: 28, pad: 1.04 }); } },
      { name: "Inside the V6", hint: "Six pistons on one crankshaft, 24 valves on four camshafts. The flash marks the cylinder that is firing.",
        go() { all(1); F.shadow(0); F.ghost(["body", "car", "mount", "wheel", "road", "ers"], 0); F.ghost("ice", 0.07); F.ghost("pipes", 0.05); F.ghost("turbo", 0.06); F.focus(engBox, { azimuth: 40, elevation: 30, pad: 0.98 }); } },
    ];

    // ---------- controls ----------
    const bar = document.createElement("div"); bar.className = "mech-controls";
    bar.innerHTML = STAGES.map((s, i) => `<button data-stage="${i}">${i + 1} ${s.name}</button>`).join("") +
      `<span class="sp"></span><span>Engine</span><input data-rpm type="range" min="${M.rpmIdle}" max="${M.rpmMax}" step="100" value="${state.rpm}" aria-label="Engine speed in rpm">` +
      `<span>Speed</span><input data-kph type="range" min="60" max="350" step="5" value="${state.kph}" aria-label="Car speed in km per hour">` +
      `<span class="sp"></span><button data-t="labels" aria-pressed="${state.labels}">Labels</button><button data-t="flow" aria-pressed="${state.flow}">Air and exhaust</button><button data-t="style">${REAL ? "Line view" : "Real view"}</button>`;
    F.mount.querySelector(".mech-stage").after(bar);
    const hintEl = F.mount.querySelector(".mech-hint");
    function setStage(i, quiet) {
      if (!quiet) F.touch();
      state.stage = ((i % STAGES.length) + STAGES.length) % STAGES.length;
      const S = STAGES[state.stage];
      S.go();
      F.labels(state.labels ? SETS[state.stage] : null);
      const fl = state.flow && state.stage > 0;
      F.flows(fl ? "pu" : null);
      if (fl) F.ghost("pipes", 0.32);
      hintEl.textContent = S.hint;
      bar.querySelectorAll("[data-stage]").forEach((b, k) => b.setAttribute("aria-pressed", k === state.stage));
    }
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return; F.touch();
      const t = b.dataset.t;
      if (b.dataset.stage) setStage(+b.dataset.stage);
      else if (t === "style") { state.style = REAL ? "line" : "real"; start(); }
      else if (t === "labels" || t === "flow") { state[t] = !state[t]; b.setAttribute("aria-pressed", state[t]); if (t === "flow" && state.stage === 0) setStage(1); else setStage(state.stage, true); }
    });
    bar.querySelector("[data-rpm]").addEventListener("input", (e) => { F.touch(); state.rpm = +e.target.value; F.run(); });
    bar.querySelector("[data-kph]").addEventListener("input", (e) => { F.touch(); state.kph = +e.target.value; F.run(); });
    F.stage.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= String(STAGES.length)) setStage(+e.key - 1); });
    F.onPress = () => setStage(state.stage + 1);
    F.tour(() => setStage(state.stage + 1, true));

    mech.card("#fig", {
      fig: "Fig 1", title: "The 2026 Formula 1 power unit",
      keys: [{ mark: "lit", label: "Click a part, or its label, to learn what it does" }, { mark: "mid", label: "Keys 1 to 3 step in. Space goes to the next stage. Drag to orbit." }],
      caption: "A 1600 cc V6, six cylinders in a 90 degree V, 80 mm bore and a 53.1 mm stroke worked out from the capacity. The crankshaft centre line is 90 mm above the reference plane, which is why the sump is flat. Two inlet and two exhaust valves per cylinder, closed by air springs. The inlet ports face outwards, so the runners arch over the cam covers. The exhaust ports face into the V, so the path to the single turbine is short. For 2026 the MGU-H is gone, the MGU-K gives 350 kW instead of 120 kW, and combustion and electric power are about half each. The two sliders drive the readout: fuel energy flow follows 0.27 times rpm plus 165, capped at 3000 MJ/h, and 48 per cent of that energy is taken as work at the crankshaft. Electric power follows 1850 minus 5 times the speed in km/h above 300 km/h. The 48 per cent figure is a typical value, not a sourced one. Motion is shown 60 times slower than real time. The car stays put and the road scrolls under it: the wheels roll without slipping at the car speed, and the road moves at that same speed, both slowed by the same 60 times as the engine. Everything keeps running in every stage. Engine speed and car speed are set on separate sliders, because the gear ratio between them is not modelled. The exhaust and turbo layout is the usual one for these engines, not a particular maker's. Valve timing, the gear ratio to the MGU-K, the bodywork, the wings and the gearbox are drawn to look right rather than from a real car. Flow dots show which way the air and the exhaust go, not how fast.",
    });
    window.fig = F; window.setStage = setStage; window.state = state;
    setStage(state.stage, true);
    F.fit(true);
  }
  addEventListener("mech-theme", start);
  start();
})();
