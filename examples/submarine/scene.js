/* How a submarine finds a target and what is inside a torpedo.
   Units: metres. World: x forward (bow at +x), y left, z up. The hull centreline is z = 0, the sea surface is z = 40.
   Sourced: speed of sound in seawater, how active and passive sonar work, torpedo length, diameter, weight,
   propulsion type and guidance. Illustrative: the hull shape and size, the depth, the place of every compartment,
   the tube layout, the length of each torpedo section and the target ship. No real product styling or badge is copied.
   Left out on purpose: warhead size, explosive type, fuzing, and range or speed performance. */
(function () {
  const D = Math.PI / 180;
  // ---------- 1. the model: every number on screen comes from here ----------
  const M = {
    c: 1500,                                     // sourced: speed of sound in seawater, m/s
    tpLen: 5.79, tpDia: 0.533, tpWeight: 3744,   // sourced: torpedo length, diameter, weight (lb)
    len: 110, dia: 10, depth: 40,                // illustrative: generic attack submarine
    sea: 40, cycle: 8,                           // sea surface height; display seconds for one ping cycle
  };
  M.r = M.dia / 2;
  // hull radius along x: rounded bow, parallel midbody, tapered stern
  M.R = (x) => {
    if (x >= 35) { const t = Math.min(1, (x - 35) / 22); return M.r * Math.pow(Math.max(0, 1 - t * t), 0.42); }
    if (x >= -10) return M.r;
    const t = Math.min(1, (-10 - x) / 38); return M.r * (1 - 0.88 * t * t);
  };
  M.sphere = [44, 0, 0];                         // centre of the bow sonar sphere
  M.target = [170, 0, M.sea];                    // illustrative: a ship on the surface
  M.range = Math.hypot(M.target[0] - M.sphere[0], M.target[1] - M.sphere[1], M.target[2] - M.sphere[2]);
  M.echoT = 2 * M.range / M.c;                   // model: range = c t / 2
  M.slow = M.cycle / 2 / M.echoT;                // how much the ping is slowed on screen (out leg takes half the cycle)
  M.pingDir = M.target.map((v, i) => (v - M.sphere[i]) / M.range);
  M.pingTilt = Math.asin(M.pingDir[2]);          // the pulse goes up toward the surface ship
  M.phull = { r: 4.2, x0: -24, x1: 33 };         // illustrative: the strong inner tube
  M.tube = { x0: 18, L: 12, ro: 0.42, ri: M.tpDia / 2, rim: 4.3, at: [[1.4, -1.2], [-1.4, -1.2], [1.4, -2.4], [-1.4, -2.4]] };
  // Each tube points forward and outboard, by the angle that puts its muzzle on the hull skin at the same height it starts.
  M.yaw = (y0, z0) => Math.asin((Math.sqrt(M.tube.rim * M.tube.rim - z0 * z0) - Math.abs(y0)) / M.tube.L);
  M.tubePoint = (y0, z0, d, dz) => { const a = M.yaw(y0, z0); return [M.tube.x0 + d * Math.cos(a), y0 + Math.sign(y0) * d * Math.sin(a), z0 + (dz || 0)]; };
  // torpedo sections, nose first. The lengths are illustrative; they add up to the sourced total length.
  M.tp = [
    { key: "seeker", len: 0.62 }, { key: "guide", len: 0.90 }, { key: "warhead", len: 1.00 },
    { key: "fuel", len: 1.60 }, { key: "engine", len: 0.90 }, { key: "tailcone", len: 0.47 }, { key: "tpjet", len: 0.30 },
  ];
  { let x = 0; for (const s of M.tp) { s.x0 = x; x += s.len; s.x1 = x; } M.tpSum = x; }
  M.tpOut = [12.6, 15.2];                        // where the torpedo's nose sits on the tube axis, clear of the muzzle at 12 m
  const state = { stage: 0, labels: true, style: location.hash === "#line" ? "line" : "real" };
  let F = null;

  function start() {
    if (F) F.dispose();
    F = new mech.Figure("#fig", { theme: document.documentElement.dataset.theme || "dark", style: state.style, width: 760, height: 500, azimuth: 34, elevation: 20 });
    const REAL = state.style === "real", COOL = 0x4aa8ff, WARM = 0xff8a2a;
    const f2 = (v) => v.toFixed(2);

    // ---------- 2. facts ----------
    const NOAA = "https://oceanservice.noaa.gov/facts/sonar.html";
    const OE = "https://oceanexplorer.noaa.gov/explorations/sound01/background/acoustics/acoustics.html";
    const USN = "https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2167907/mk-48-heavyweight-torpedo/";
    const RAN = "https://www.navy.gov.au/capabilities/weapons/mark-48";
    const FAS = "https://man.fas.org/dod-101/sys/ship/weaps/mk-48.htm";
    F.facts([
      { id: "sound", claim: "Sound travels about 1500 metres per second in seawater, against about 340 in air.", status: "sourced", source: "NOAA Ocean Explorer, Understanding Ocean Acoustics", url: OE },
      { id: "active", claim: "Active sonar sends out a pulse of sound. The pulse bounces off an object and comes back as an echo. The time between sending and receiving gives the range and the direction of the object.", status: "sourced", source: "NOAA Ocean Service, What is sonar?", url: NOAA },
      { id: "passive", claim: "Passive sonar sends out no sound of its own. It only listens, which suits a vessel that does not want to be found.", status: "sourced", source: "NOAA Ocean Service, What is sonar?", url: NOAA },
      { id: "triang", claim: "Several passive sensors together can fix where a sound comes from.", status: "sourced", source: "NOAA Ocean Service, What is sonar?", url: NOAA },
      { id: "tpsize", claim: "The Mark 48 torpedo is 21 inches (533 mm) across and weighs 3744 pounds. It runs on liquid propellant and homes acoustically.", status: "sourced", source: "US Navy fact file, MK 48 heavyweight torpedo", url: USN },
      { id: "tplen", claim: "The Mark 48 torpedo is 5.79 metres long.", status: "sourced", source: "Royal Australian Navy, Mark 48", url: RAN },
      { id: "guide", claim: "The torpedo can run on a guide wire from the submarine, and it homes with passive or active sonar of its own.", status: "sourced", source: "Royal Australian Navy, Mark 48", url: RAN },
      { id: "range", claim: "Range = speed of sound x echo time / 2. In this figure the target is " + Math.round(M.range) + " m away, so the echo comes back in " + f2(M.echoT) + " s.", status: "model" },
      { id: "slow", claim: "The pulse on screen is slowed about " + Math.round(M.slow) + " times.", status: "model" },
      { id: "jet", claim: "The torpedo is driven by a piston engine turning a pump-jet propulsor.", status: "assumed", source: "FAS reference page for the MK 48. Not stated on the Navy fact file.", url: FAS },
      { id: "spools", claim: "The guide wire pays out from a spool in the torpedo and a spool left in the tube, so neither end has to drag the wire.", status: "assumed", source: "The usual arrangement for a wire-guided torpedo. Not looked up for this figure." },
      { id: "coat", claim: "The hull is covered in rubber tiles that soak up sound.", status: "assumed", source: "Common on modern submarines. Not checked against a maker's page." },
      { id: "tpsect", claim: "The length of each torpedo section: nose, guidance, warhead, fuel, engine, tail cone and pump-jet.", status: "illustrative", source: "Not published. Chosen so the sections add up to the sourced total length." },
      { id: "shell", claim: "The hull shape and size (" + M.len + " m long, " + M.dia + " m across), the " + M.depth + " m depth, the pressure hull, the decks, the sonar room, the four tubes and the target ship.", status: "illustrative" },
    ]);

    // ---------- 3. the sea and the target ----------
    F.box({ w: 420, d: 420, h: 0.3 }, { mat: "glass", color: 0x1c4463, at: [85, -40, M.sea], tag: "sea", info: "sea", edges: false, shadow: false });
    { const secs = [], keys = [[-24, 1.0], [-16, 3.6], [0, 4.6], [13, 4.3], [23, 1.5]];
      for (const [dx, w] of keys) secs.push({ x: M.target[0] + dx, pts: mech.superSection(w, M.sea - 9, M.sea + 4.5, 3.2) });
      F.add(mech.loftGeo(secs), { mat: "flat", color: 0x343a44, tag: "ship", info: "target", edges: 40, shadow: false });
      F.box({ w: 46, d: 9.4, h: 0.5, r: 0.8 }, { mat: "flat", color: 0x565d68, at: [M.target[0], 0, M.sea + 4.1], tag: "ship", info: "target", shadow: false });
      F.box({ w: 16, d: 7.2, h: 4.0, r: 0.6 }, { mat: "castAl", at: [M.target[0] - 4, 0, M.sea + 4.5], tag: "ship", info: "target", shadow: false });
      F.box({ w: 6, d: 5, h: 4.6, r: 0.5 }, { mat: "castAl", at: [M.target[0] + 2, 0, M.sea + 8.5], tag: "ship", info: "target", shadow: false });
      F.cyl({ r: 0.35, h: 7, n: 10 }, { mat: "steel", at: [M.target[0] + 4, 0, M.sea + 13.1], tag: "ship", info: "target", shadow: false }); }

    // ---------- 4. the boat: hull and dome as two lofts, so the bow can be made see-through ----------
    const sections = (a, b, step) => { const out = []; for (let x = a; x <= b + 1e-9; x += step) { const r = Math.max(0.05, M.R(x)); out.push({ x, pts: mech.superSection(r, -r, r, 2) }); } return out; };
    const hull = F.add(mech.loftGeo(sections(-48, 36, 3), { caps: false }), { mat: "rubber", color: 0x1a1d21, tag: "hull", info: "hull", edges: 38 });
    const dome = F.add(mech.loftGeo(sections(36, 56.2, 2), { caps: false }), { mat: "rubber", color: 0x1a1d21, tag: "dome", info: "dome", edges: 38 });
    F.lathe([[M.R(56.2), 0], [M.R(56.2) * 0.8, 0.3], [0, 0.65]], { axis: "x", n: 28 }, { mat: "rubber", color: 0x1a1d21, at: [56.2, 0, 0], tag: "dome", info: "dome" });
    // sail and masts
    F.add(mech.profileGeo([[5.5, 4.4], [9.5, 12.2], [21.5, 12.2], [25.5, 4.4]], 3.2, 0), { mat: "rubber", color: 0x1a1d21, tag: "sail", info: "sail", edges: 34 });
    const masts = [F.cyl({ r: 0.24, h: 5.6, n: 14 }, { mat: "darkSteel", at: [11, 0, 12.2], tag: "mast", info: "mast" }),
      F.cyl({ r: 0.18, h: 4.2, n: 12 }, { mat: "darkSteel", at: [14.6, 0, 12.2], tag: "mast", info: "mast" })];
    F.box({ w: 0.9, d: 0.5, h: 0.5, r: 0.1 }, { mat: "machined", at: [11, 0, 17.6], tag: "mast", info: "mast" });
    // dive planes, stern planes and rudder
    for (const s of [-1, 1]) F.box({ w: 4.2, d: 5.2, h: 0.55, r: 0.2 }, { mat: "rubber", color: 0x1a1d21, at: [26, s * 6.8, 0.6], tag: "plane", info: "plane" });
    for (const s of [-1, 1]) F.box({ w: 4.6, d: 5.6, h: 0.5, r: 0.2 }, { mat: "rubber", color: 0x1a1d21, at: [-43.5, s * 3.9, -0.25], tag: "plane", info: "sternplane" });
    for (const s of [1, -1]) F.box({ w: 4.6, d: 0.5, h: 5.6, r: 0.2 }, { mat: "rubber", color: 0x1a1d21, at: [-43.5, 0, s > 0 ? 1.0 : -6.6], tag: "plane", info: "rudder" });
    // propulsor: a shroud round a rotor on the shaft
    F.lathe([[2.55, 0], [2.95, 0.35], [2.95, 3.3], [2.6, 3.7]], { axis: "x", n: 32 }, { mat: "darkSteel", at: [-52.2, 0, 0], tag: "prop", info: "prop" });
    F.cyl({ r: 1.0, h: 4.6, n: 20, axis: "x" }, { mat: "darkSteel", at: [-50.5, 0, 0], tag: "prop", info: "prop" });
    const rotor = F.group({ at: [-51.4, 0, 0], info: "prop" });
    for (let i = 0; i < 7; i++) { const bg = F.group({ rot: [i * 360 / 7 * D, 0, 0], group: rotor });
      F.box({ w: 1.5, d: 0.16, h: 1.55, r: 0.06 }, { mat: "castAl", at: [0, 0, 0.95], rot: [0, 14 * D, 0], tag: "prop", info: "prop", group: bg, edges: false }); }

    // ---------- 5. inside: pressure hull, decks, sonar, tubes ----------
    F.cyl({ r: M.phull.r, h: M.phull.x1 - M.phull.x0, n: 40, axis: "x" }, { mat: "castAl", at: [M.phull.x0, 0, 0], tag: "phull", info: "phull", edges: false });
    for (const z of [1.9, -1.4]) F.box({ w: M.phull.x1 - M.phull.x0 - 2, d: 7.4, h: 0.22 }, { mat: "steel", at: [(M.phull.x0 + M.phull.x1) / 2, 0, z], tag: "deck", info: "deck", edges: false });
    // bow sonar sphere, on its mount, inside the dome
    const sph = F.add(new THREE.SphereGeometry(3.3, 30, 20), { mat: "machined", at: M.sphere, tag: "sphere", info: "sphere", edges: false });
    F.box({ w: 2.2, d: 3.6, h: 3.6, r: 0.4 }, { mat: "darkSteel", at: [39.4, 0, -1.8], tag: "sphere", info: "sphere" });
    // passive arrays: flat panels on each side, and a cable towed behind
    for (const s of [-1, 1]) for (const x of [2, 12, 22]) F.box({ w: 8.4, d: 0.35, h: 2.0, r: 0.1 }, { mat: "plastic", at: [x, s * 4.75, -1.4], tag: "array", info: "array", edges: false });
    F.tube([[-44, 1.0, -0.4], [-58, 1.4, -0.8], [-76, 1.8, -1.2], [-98, 2.1, -1.6]], 0.13, { mat: "plastic", tag: "towed", info: "towed" });
    F.cyl({ r: 0.4, h: 1.6, n: 12, axis: "x" }, { mat: "darkSteel", at: [-45.6, 1.0, -0.4], tag: "towed", info: "towed" });
    // sonar room: consoles and a screen on the upper deck
    F.box({ w: 4.6, d: 2.2, h: 1.5, r: 0.1 }, { mat: "darkSteel", at: [17.5, -2.2, 1.9], tag: "room", info: "room" });
    F.box({ w: 4.0, d: 0.12, h: 1.1 }, { mat: "light", color: 0x2b6fa8, at: [17.5, -1.05, 2.5], tag: "room", info: "room", edges: false, shadow: false });
    F.box({ w: 1.1, d: 1.1, h: 0.9, r: 0.3 }, { mat: "plastic", at: [17.5, -3.9, 1.9], tag: "room", info: "room", edges: false });
    // four torpedo tubes, each a steel sleeve with a breech door aft and an outer door forward
    const TG = M.tube.at.map(([y, z], i) => {
      const tg = i ? "tubes" : "tube", G = F.group({ at: [M.tube.x0, y, z], rot: [0, 0, Math.sign(y) * M.yaw(y, z)] });
      F.lathe([[M.tube.ri, 0], [M.tube.ro, 0], [M.tube.ro, M.tube.L], [M.tube.ri, M.tube.L]], { axis: "x", n: 28 }, { mat: i ? "steel" : "flat", color: i ? undefined : 0x99a0aa, group: G, tag: tg, info: "tube" });
      F.cyl({ r: M.tube.ro, h: 0.14, n: 24, axis: "x" }, { mat: "darkSteel", at: [-0.16, 0, 0], group: G, tag: tg, info: "breech" });
      F.cyl({ r: M.tube.ro + 0.03, h: 0.12, n: 24, axis: "x" }, { mat: "darkSteel", at: [M.tube.L + 0.08, 0, 0], group: G, tag: tg, info: "outerdoor" });
      return G;
    });

    // ---------- 6. the torpedo, in its own group so it can swim out of the tube ----------
    const TUBE = M.tube.at[0], TP = F.group({ at: [M.tpOut[0], 0, 0], group: TG[0] });
    const sec = (key) => M.tp.find((s) => s.key === key);
    const rr = M.tpDia / 2, tpo = (key, mat) => ({ mat, at: [sec(key).x0, 0, 0], tag: "torp", info: key, group: TP });
    F.lathe([[0.03, 0], [0.13, 0.07], [0.21, 0.2], [rr, 0.44], [rr, sec("seeker").len]], { axis: "x", n: 28 }, tpo("seeker", "machined"));
    F.cyl({ r: 0.2, h: 0.05, n: 20, axis: "x" }, { mat: "light", color: 0x7fc4ff, at: [0.3, 0, 0], tag: "torp", info: "seeker", group: TP, edges: false, shadow: false });
    for (const [key, mat] of [["guide", "castAl"], ["warhead", "darkSteel"], ["fuel", "steel"], ["engine", "iron"]])
      F.cyl({ r: rr, h: sec(key).len, n: 28, axis: "x" }, tpo(key, mat));
    F.lathe([[rr, 0], [rr, 0.1], [0.17, sec("tailcone").len]], { axis: "x", n: 28 }, tpo("tailcone", "steel"));
    F.lathe([[0.17, 0], [0.24, 0.05], [0.24, sec("tpjet").len - 0.04], [0.19, sec("tpjet").len]], { axis: "x", n: 28 }, tpo("tpjet", "darkSteel"));
    for (const sc of M.tp.slice(0, 5)) F.cyl({ r: rr + 0.012, h: 0.035, n: 28, axis: "x" }, { mat: "darkSteel", at: [sc.x1 - 0.018, 0, 0], tag: "torp", info: sc.key, group: TP, edges: false });
    const tpRotor = F.group({ at: [sec("tpjet").x0 + 0.14, 0, 0], group: TP, info: "tpjet" });
    for (let i = 0; i < 5; i++) { const bg = F.group({ rot: [i * 72 * D, 0, 0], group: tpRotor });
      F.box({ w: 0.16, d: 0.04, h: 0.13, r: 0.02 }, { mat: "machined", at: [0, 0, 0.06], rot: [0, 16 * D, 0], tag: "torp", info: "tpjet", group: bg, edges: false }); }
    for (let i = 0; i < 4; i++) { const fg = F.group({ at: [sec("engine").x1 - 0.5, 0, 0], rot: [(45 + i * 90) * D, 0, 0], group: TP });
      F.box({ w: 0.46, d: 0.07, h: 0.26, r: 0.02 }, { mat: "castAl", at: [0, 0, rr - 0.02], tag: "torp", info: "fins", group: fg }); }
    F.cyl({ r: 0.1, h: 0.16, n: 14, axis: "x" }, { mat: "brass", at: [M.tpLen - 0.02, 0, 0], tag: "torp", info: "wire", group: TP, edges: false });
    const wire = F.link(M.tubePoint(TUBE[0], TUBE[1], 0, -0.16), M.tubePoint(TUBE[0], TUBE[1], 6, -0.16), { w: 0.07, d: 0.07, r: 0.03 }, { mat: "brass", tag: "torp", info: "wire", edges: false, shadow: false });

    // ---------- 7. the pulse and the echo: rings that travel along the real path ----------
    const PG = F.group({ at: M.sphere, rot: [0, -M.pingTilt, 0] });
    const ring = (color) => { const m = F.add(mech.torusGeo({ R: 1, r: 0.22, axis: "x", n: 40 }), { color, tag: "flow", group: PG, edges: false, shadow: false }); m.material.emissive.set(color); m.visible = false; return m; };
    const out = [ring(COOL), ring(COOL), ring(COOL)], back = [ring(WARM), ring(WARM)];

    // ---------- 8. checks: the model must agree with the facts ----------
    F.check("the torpedo sections add up to the sourced length", Math.abs(M.tpSum - M.tpLen) < 1e-9, f2(M.tpSum) + " m");
    F.check("the torpedo fits the tube bore", M.tpDia / 2 <= M.tube.ri + 1e-9 && M.tpLen < M.tube.L, f2(M.tpLen) + " m in a " + M.tube.L + " m tube");
    F.check("range from the echo time equals the drawn distance", Math.abs(M.c * M.echoT / 2 - M.range) < 1e-9, f2(M.range) + " m");
    F.check("the echo time is twice the one-way time", Math.abs(M.echoT - 2 * (M.range / M.c)) < 1e-9);
    { let ok = true; for (let x = M.phull.x0; x <= M.phull.x1; x += 0.5) if (M.phull.r > M.R(x) - 0.1) ok = false;
      F.check("the pressure hull stays inside the outer hull", ok, "r " + M.phull.r + " m from x " + M.phull.x0 + " to " + M.phull.x1); }
    { let inside = true, atSkin = true, clearSphere = true, worst = 9;
      for (const [y, z] of M.tube.at) {
        for (let d = 0; d <= M.tube.L; d += 0.25) { const p = M.tubePoint(y, z, d); if (Math.hypot(p[1], p[2]) + M.tube.ro > M.R(p[0]) + 1e-9) inside = false;
          const g = Math.hypot(p[0] - M.sphere[0], p[1], p[2]); worst = Math.min(worst, g); if (g < 3.3 + M.tube.ro) clearSphere = false; }
        const m = M.tubePoint(y, z, M.tube.L); if (M.R(m[0]) - Math.hypot(m[1], m[2]) > 0.8) atSkin = false;
      }
      F.check("every tube stays inside the outer hull", inside);
      F.check("every tube reaches the hull skin, so the torpedo leaves the boat", atSkin);
      F.check("no tube runs through the sonar sphere", clearSphere, f2(worst) + " m from the centre of a 3.3 m sphere"); }
    F.check("the sonar sphere fits inside the bow dome", 3.3 + Math.abs(M.sphere[0] - 44) < M.R(M.sphere[0]) - 0.2, "sphere r 3.3 m, dome r " + f2(M.R(M.sphere[0])) + " m");
    F.check("the boat is below the sea surface", M.sea > 17.6 + 1, "masts reach " + 17.6 + " m of " + M.sea + " m");
    F.check("the pulse starts at the sphere and ends at the target", Math.abs(M.sphere[0] + M.pingDir[0] * M.range - M.target[0]) < 1e-9 && Math.abs(M.sphere[2] + M.pingDir[2] * M.range - M.target[2]) < 1e-9);
    { const len = (u) => M.tpOut[0] + u * (M.tpOut[1] - M.tpOut[0]) + M.tpLen;
      F.check("the guide wire is as long as the run plus the torpedo, and it grows", len(0) > M.tube.L && len(1) > len(0), f2(len(0)) + " m to " + f2(len(1)) + " m"); }

    // ---------- 9. what each part is ----------
    F.describe({
      hull: { name: "Outer hull", what: "The smooth outer skin, shaped like a teardrop.", does: "It lets the boat move through the water quietly.", how: "Water follows the curve instead of breaking away from it, and rubber tiles on the skin soak up sound.", fact: M.len + " m long, " + M.dia + " m across.", src: ["shell", "coat"] },
      dome: { name: "Bow dome", what: "A shell over the nose of the boat.", does: "It covers the main sonar and keeps the bow smooth.", how: "It is built so that sound passes through it.", src: "shell" },
      sphere: { name: "Sonar sphere", what: "A ball covered in small sound sensors, with its own sound makers.", does: "It listens for noise in the water, and it can send out a pulse.", how: "Sensors on a curved ball face every direction at once, so the boat can tell which way a sound came from.", src: ["passive", "active"] },
      array: { name: "Hull arrays", what: "Long panels of sound sensors fixed along each side.", does: "They listen to a wide span of water out to each side.", how: "Sensors spread far apart hear the same sound at slightly different times, which gives the direction.", src: ["passive", "triang"] },
      towed: { name: "Towed array", what: "A long cable of sound sensors trailed behind the boat.", does: "It listens well astern, away from the boat's own machinery noise.", src: ["passive", "triang"] },
      room: { name: "Sonar room", what: "Consoles inside the pressure hull.", does: "Software and crew sort the sounds and work out the bearing and the range.", src: "active" },
      phull: { name: "Pressure hull", what: "The strong inner tube that holds the air, the crew and the machinery.", does: "It keeps the sea out at depth.", how: "A round tube carries pressure evenly all the way round, so it does not fold in.", src: "shell" },
      deck: { name: "Decks", what: "Floors inside the pressure hull.", does: "They split the boat into levels to live and work in.", src: "shell" },
      sail: { name: "Sail", what: "The fin on top of the hull.", does: "It carries the masts and gives a high place to stand on the surface." },
      mast: { name: "Masts", what: "Tubes that slide up out of the sail.", does: "They lift the periscope, the radio and the radar above the water." },
      plane: { name: "Dive planes", what: "Small wings near the bow.", does: "They tilt the boat nose down or nose up, so it dives or rises while it moves." },
      sternplane: { name: "Stern planes", what: "Wings each side of the tail.", does: "They hold the angle of the boat steady." },
      rudder: { name: "Rudder", what: "The upright fin at the tail.", does: "It turns the boat left and right." },
      prop: { name: "Propulsor", what: "A rotor inside a ring at the tail.", does: "It drives the boat forward.", how: "The ring round the blades holds the water in, which keeps the blade tips from making noise.", src: "jet" },
      tube: { name: "Torpedo tube", what: "A steel sleeve through the bow, open to the sea at the front.", does: "It holds the torpedo and lets it out without flooding the boat.", how: "The inner door and the outer door never open together, so the sea never reaches the crew.", fact: "533 mm across.", src: "tpsize" },
      breech: { name: "Breech door", what: "The door at the inboard end of the tube.", does: "It is the door the crew loads the torpedo through." },
      outerdoor: { name: "Outer door", what: "The door at the sea end of the tube.", does: "It opens only once the tube is flooded and the inner door is shut." },
      seeker: { name: "Seeker nose", what: "A sonar in the nose of the torpedo.", does: "It finds the target for itself in the last part of the run.", how: "It listens for the target, and it can also send its own pulses and time the echoes.", src: ["guide", "active"] },
      guide: { name: "Guidance section", what: "The computer and the steering gear.", does: "It decides where to go and moves the tail fins.", src: "tpsect" },
      warhead: { name: "Warhead section", what: "The section that carries the explosive charge.", does: "It is the part that does the damage.", src: "tpsect" },
      fuel: { name: "Fuel tank", what: "A tank of liquid fuel.", does: "It feeds the engine for the whole run.", src: "tpsize" },
      engine: { name: "Engine", what: "A piston engine driven by the burning fuel.", does: "It turns the shaft that drives the pump-jet.", src: ["tpsize", "jet"] },
      tailcone: { name: "Tail cone", what: "The narrowing section at the back.", does: "It carries the fins and guides water into the pump-jet.", src: "tpsect" },
      tpjet: { name: "Pump-jet", what: "A small rotor inside a ring.", does: "It pushes the torpedo forward.", how: "The ring keeps the water from spilling off the blade tips, which makes less noise for the torpedo's own sonar to hear.", src: "jet" },
      fins: { name: "Tail fins", what: "Four fins at the back of the torpedo.", does: "They steer it and keep it running straight.", src: "guide" },
      wire: { name: "Guide wire", what: "A thin wire that unwinds behind the torpedo.", does: "It carries steering orders out from the boat and sound from the torpedo back.", how: "Wire pays out from a spool in the torpedo and a spool left in the tube, so neither end has to drag it.", src: ["guide", "spools"] },
      target: { name: "Surface ship", what: "A ship on the surface, the thing being tracked.", does: "Its propellers and machinery make the noise the sonar hears.", src: "shell" },
      sea: { name: "Sea surface", what: "The top of the water, " + M.depth + " m above the boat.", does: "It reflects sound, so some of it bounces between the surface and the sea floor.", src: "shell" },
    });
    F.label("hull", { set: "boat", on: [8, 0, -4.4] }); F.label("sail", { set: "boat" }); F.label("mast", { set: "boat", on: masts[0] });
    F.label("dome", { set: "boat", on: [50, 0, 2.4] }); F.label("plane", { set: "boat" }); F.label("prop", { set: "boat", on: [-52, 0, 2.6] }); F.label("towed", { set: "boat", on: [-70, 1.6, -1.0] });
    F.label("sphere", { set: "sonar", on: sph }); F.label("array", { set: "sonar", on: [12, -4.75, -1.4] });
    F.label("room", { set: "sonar", on: [17.5, -2.2, 2.9] }); F.label("target", { set: "sonar", on: [M.target[0] + 3, 0, M.sea + 11] });
    F.label("tube", { set: "torp", on: M.tubePoint(TUBE[0], TUBE[1], 10.4, 0.42) }); F.label("outerdoor", { set: "torp", on: M.tubePoint(TUBE[0], TUBE[1], 12.2, 0.3) });
    for (const k of ["seeker", "guide", "warhead", "fuel", "engine", "tpjet", "wire"]) F.label(k, { set: "torp" });

    // ---------- 10. running ----------
    F.onFrame((dt, t) => {
      rotor.rotation.x = t * 0.9;
      tpRotor.rotation.x = -t * 9;
      // the ping cycle: out on the first half, echo back on the second
      const u = (t % M.cycle) / M.cycle, lit = state.stage === 1;
      const put = (m, k, s) => { const vis = lit && s >= 0 && s <= 1; m.visible = vis; if (!vis) return; const d = s * M.range; m.position.x = d; const R = 2.2 + d * 0.085; m.scale.set(1, R, R); m.material.opacity = Math.max(0.08, 0.75 * (1 - s * 0.6)); m.material.transparent = true; };
      const leg = u < 0.5 ? u * 2 : (u - 0.5) * 2;
      out.forEach((m, i) => put(m, i, u < 0.5 ? leg - i * 0.06 : -1));
      back.forEach((m, i) => put(m, i, u < 0.5 ? -1 : 1 - (leg - i * 0.06)));
      // the torpedo swims out of the tube, the wire pays out behind it
      const swim = state.stage === 2 ? Math.min(1, ((t % 12) < 2 ? 0 : ((t % 12) - 2) / 8)) : 0;
      TP.position.x = M.tpOut[0] + swim * (M.tpOut[1] - M.tpOut[0]);
      wire.setEnds(M.tubePoint(TUBE[0], TUBE[1], 0, -0.16), M.tubePoint(TUBE[0], TUBE[1], TP.position.x + M.tpLen, -0.16));
      if (state.stage === 0) F.readout("hull " + M.len + " m long, " + M.dia + " m across · " + M.depth + " m down · generic shape");
      else if (state.stage === 1) F.readout(u < 0.5 ? "pulse out · " + Math.round(leg * M.range) + " m from the boat" : "echo back · " + Math.round((1 - leg) * M.range) + " m to go · range " + Math.round(M.range) + " m, echo in " + f2(M.echoT) + " s");
      else F.readout("torpedo " + M.tpLen + " m long, " + Math.round(M.tpDia * 1000) + " mm across · wire out " + (TP.position.x + M.tpLen).toFixed(1) + " m");
    });

    // ---------- 11. stages ----------
    const box = (a, b) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b));
    const STAGES = [
      { name: "Boat", set: "boat", hint: "A generic attack submarine. The black skin is rubber tile that soaks up sound.",
        go() { F.ghost(["hull", "dome", "sail", "mast", "plane", "prop", "towed", "ship"], 1); F.ghost(["phull", "deck", "room", "tube", "tubes", "torp", "array", "sphere"], 0); F.ghost("sea", 0.12); F.shadow(0); F.focus(box([-56, -14, -14], [58, 14, 19]), { azimuth: 34, elevation: 20, pad: 1.04 }); } },
      { name: "Sonar", set: "sonar", hint: "The sphere sends one pulse. It comes back " + f2(M.echoT) + " s later, so the ship is " + Math.round(M.range) + " m away.",
        go() { F.ghost(["hull", "dome"], 0.15); F.ghost(["sail", "mast", "plane", "prop", "towed"], 0.45); F.ghost(["sphere", "array", "room", "ship"], 1); F.ghost(["phull", "deck", "tube", "tubes"], 0.1); F.ghost("torp", 0); F.ghost("sea", 0.11); F.shadow(0); F.focus(box([-4, -12, -10], [M.target[0] + 26, 12, M.sea + 12]), { azimuth: 30, elevation: 22, pad: 1.02 }); } },
      { name: "Torpedo", set: "torp", hint: "The torpedo leaves the tube. The wire pays out behind it, then the nose sonar takes over.",
        go() { F.ghost(["hull", "dome"], 0.04); F.ghost("phull", 0.025); F.ghost(["sail", "mast", "plane", "prop", "deck", "array", "sphere", "room", "ship", "sea", "towed"], 0); F.ghost("tubes", 0.05); F.ghost("tube", 0.4); F.ghost("torp", 1); F.shadow(0); F.focus(box([M.tube.x0 + 10.4, 3.2, -2.3], [M.tubePoint(TUBE[0], TUBE[1], M.tpOut[1] + M.tpLen)[0] + 1.4, 7.2, -0.1]), { azimuth: 44, elevation: 20, pad: 1.03 }); } },
    ];

    // ---------- 12. controls ----------
    const bar = document.createElement("div"); bar.className = "mech-controls";
    bar.innerHTML = STAGES.map((s, i) => `<button data-stage="${i}">${i + 1} ${s.name}</button>`).join("") +
      `<span class="sp"></span><button data-t="labels" aria-pressed="${state.labels}">Labels</button><button data-t="style">${REAL ? "Line view" : "Real view"}</button>`;
    F.mount.querySelector(".mech-stage").after(bar);
    const hintEl = F.mount.querySelector(".mech-hint");
    function setStage(i, quiet) { if (!quiet) F.touch(); state.stage = ((i % STAGES.length) + STAGES.length) % STAGES.length; const S = STAGES[state.stage]; S.go(); F.labels(state.labels ? S.set : null); hintEl.textContent = S.hint; bar.querySelectorAll("[data-stage]").forEach((b, k) => b.setAttribute("aria-pressed", k === state.stage)); }
    bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F.touch(); const t = b.dataset.t;
      if (b.dataset.stage) setStage(+b.dataset.stage); else if (t === "style") { state.style = REAL ? "line" : "real"; start(); }
      else if (t === "labels") { state.labels = !state.labels; b.setAttribute("aria-pressed", state.labels); setStage(state.stage, true); } });
    F.stage.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= String(STAGES.length)) setStage(+e.key - 1); });
    F.onPress = () => setStage(state.stage + 1);
    F.tour(() => setStage(state.stage + 1, true));

    mech.card("#fig", {
      fig: "Fig 1", title: "Submarine: sonar and torpedo",
      keys: [{ mark: "lit", label: "Click a part, or its label, to learn what it does" }, { mark: "mid", label: "Keys 1 to 3 change the view. Drag to orbit." }],
      caption: "A generic attack submarine, not a real boat, and no product styling. Sourced: the speed of sound in seawater, how active and passive sonar work, and the torpedo's length, diameter, weight, propulsion and guidance. Illustrative: the hull shape and size, the " + M.depth + " m depth, the place of every compartment and tube, the length of each torpedo section, and the target ship. The pulse on screen is slowed about " + Math.round(M.slow) + " times, and the rings show direction only, not the shape of a real sound beam. Warhead size, explosive type and fuzing are left out on purpose.",
    });
    window.fig = F; window.setStage = setStage; window.state = state;
    setStage(state.stage, true); F.fit(true);
  }
  addEventListener("mech-theme", start);
  start();
})();
