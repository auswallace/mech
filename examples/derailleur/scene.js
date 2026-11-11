/* How a rear derailleur shifts gears. Units: millimetres. x forward, y left, z up. The drive side is at -y.
   The rear axle is the origin of the bike group. The bike is generic and carries no brand.
   Sourced: 8-speed cog spacing, cog thickness and the 11 to 32 tooth set. Assumed: 12.7 mm chain pitch, 11-tooth pulleys.
   Illustrative: the chainring size, the frame, and the exact derailleur dimensions. */
(function () {
  const D = Math.PI / 180, PR = mech.pitchRadius;
  // ---------- 1. the model ----------
  const M = {
    pitch: 12.7, cogs: [11, 13, 15, 18, 21, 24, 28, 32], spacing: 4.8, cogThick: 1.85, ring: 40, pulley: 11,
    wheelR: 340, stay: 415, drop: 70, crank: 170, cadence: 50,
    y0: -58, ringY: -44, hangerY: -70,
    H: [-30, -36], link: 56, slant: 30 * D, e: [0.94, -0.34], offset: 10, hang: 25.3, cage: 75,
  };
  M.r = M.cogs.map((n) => PR(n, M.pitch)); M.rRing = PR(M.ring, M.pitch); M.rP = PR(M.pulley, M.pitch);
  M.bb = [Math.sqrt(M.stay ** 2 - M.drop ** 2), -M.drop];
  M.cogY = (g) => M.y0 + g * M.spacing;
  M.lerp = (arr, g) => { const i = Math.max(0, Math.min(arr.length - 2, Math.floor(g))), f = g - i; return arr[i] + (arr[i + 1] - arr[i]) * f; };
  // parallelogram: the links swing by alpha. The p-knuckle moves inboard and, because the pivots are slanted, also down.
  M.alpha = (g) => Math.asin((M.cogY(g) - M.hangerY - M.offset) / (M.link * Math.cos(M.slant)));
  M.swing = (g) => { const a = M.alpha(g), c = M.link * Math.cos(a), s = M.link * Math.sin(a); return [c * M.e[0], s * Math.cos(M.slant), c * M.e[1] - s * Math.sin(M.slant)]; };   // from b-pivot to p-pivot
  M.guide = (g) => { const v = M.swing(g); return [M.H[0] + v[0], M.H[1] + v[2] - M.hang]; };          // guide pulley centre in x-z
  M.tension = (g, psi) => { const G = M.guide(g); return [G[0] - M.cage * Math.sin(psi), G[1] - M.cage * Math.cos(psi)]; };
  M.path = (g, psi) => { const y = M.cogY(g); return mech.wrapPath([{ c: [0, 0], r: M.lerp(M.r, g), s: -1, y }, { c: M.bb, r: M.rRing, s: -1, y: M.ringY }, { c: M.tension(g, psi), r: M.rP, s: -1, y }, { c: M.guide(g), r: M.rP, s: 1, y }]); };
  // the chain has a fixed number of links. The cage angle psi is whatever makes the path that long.
  M.links = 2 * Math.ceil(M.path(7, -0.75).length / M.pitch / 2);
  M.psi = (g) => { let lo = -0.9, hi = 2.2; const want = M.links * M.pitch; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; M.path(g, mid).length < want ? (lo = mid) : (hi = mid); } return (lo + hi) / 2; };
  M.ratio = (g) => M.ring / M.cogs[Math.round(g)];
  const state = { gear: 2, g: 2, demo: null, stage: 0, labels: true, theta: 0, phase: 0, style: location.hash === "#line" ? "line" : "real" };
  let F = null;

  function start() {
    if (F) F.dispose();
    F = new mech.Figure("#fig", { theme: document.documentElement.dataset.theme || "dark", style: state.style, width: 760, height: 500, azimuth: 38, elevation: 16 });
    const REAL = state.style === "real", B = F.group({ at: [0, 0, M.wheelR] }), bx = M.bb[0], bz = M.bb[1];
    const o = (x) => Object.assign({ group: B }, x);

    // ---------- 2. facts and checks ----------
    F.facts([
      { id: "cogs", claim: "An 8-speed 11 to 32 cassette has cogs of 11, 13, 15, 18, 21, 24, 28 and 32 teeth.", status: "sourced", source: "BikeGremlin, sprocket standards", url: "https://bike.bikegremlin.com/209/bicycle-speeds-rear-sprockets/" },
      { id: "spacing", claim: "8-speed cogs are 1.85 mm thick and sit 4.8 mm apart, centre to centre.", status: "sourced", source: "BikeGremlin, sprocket standards", url: "https://bike.bikegremlin.com/209/bicycle-speeds-rear-sprockets/" },
      { id: "pitch", claim: "Bicycle chain pitch is 12.7 mm (half an inch).", status: "assumed", source: "Common standard. Not looked up for this figure." },
      { id: "pulley", claim: "Both derailleur pulleys have 11 teeth.", status: "assumed", source: "Typical value." },
      { id: "ratio", claim: "The wheel turns (chainring teeth / cog teeth) times for each turn of the pedals.", status: "model" },
      { id: "chain", claim: "The chain has " + M.links + " links here. The cage angle is solved so the chain path always has that length.", status: "model" },
      { id: "geom", claim: "The 40-tooth chainring, the frame and the derailleur dimensions.", status: "illustrative" },
    ]);
    const want = M.links * M.pitch;
    M.cogs.forEach((n, g) => {
      const psi = M.psi(g), P = M.path(g, psi), G = M.guide(g), T = M.tension(g, psi);
      F.check("chain length in gear " + (g + 1), Math.abs(P.length - want) < 0.5, (P.length - want).toFixed(2) + " mm off");
      F.check("guide pulley clears cog " + (g + 1), Math.hypot(G[0], G[1]) - M.r[g] - M.rP > 4, (Math.hypot(G[0], G[1]) - M.r[g] - M.rP).toFixed(1) + " mm gap");
      F.check("tension pulley clears cog " + (g + 1), Math.hypot(T[0], T[1]) - M.r[g] - M.rP > 4);
      F.check("guide pulley is under cog " + (g + 1), Math.abs(M.hangerY + M.offset + M.swing(g)[1] - M.cogY(g)) < 0.01);
    });
    F.check("cage swings back for small cogs", M.psi(0) > M.psi(7) + 0.3, (M.psi(0) / D).toFixed(0) + " vs " + (M.psi(7) / D).toFixed(0) + " deg");

    // ---------- 3. parts ----------
    // wheel (turns with the cassette while you pedal)
    const wheel = F.group({ group: B, info: "wheel" }), w = (x) => Object.assign({ group: wheel, tag: "wheel" }, x);
    F.torus({ R: 325, r: 15, axis: "y", n: 64 }, w({ mat: "rubber" }));
    F.lathe([[300, -8], [309, -12], [312, -12], [312, 12], [309, 12], [300, 8]], { axis: "y", n: 64 }, w({ mat: "darkSteel" }));
    F.lathe([[0, -34], [13, -34], [13, -30], [22, -29], [22, -26], [12, -24], [12, 30], [22, 32], [22, 35], [13, 36], [13, 40], [0, 40]], { axis: "y", n: 24 }, w({ mat: "castAl" }));
    for (let i = 0; i < 24; i++) { const a = i * 15 * D, b = a + (i % 2 ? 0.5 : -0.5), y = i % 2 ? 33 : -27; F.link([21 * Math.cos(b), y, 21 * Math.sin(b)], [301 * Math.cos(a), 0, 301 * Math.sin(a)], { w: 1.6, d: 1.6, r: 0.7 }, w({ mat: "steel", edges: false, shadow: false })); }
    // cassette: eight cogs fixed together on the freehub
    const cass = F.group({ group: B, info: "cassette" }), c = (x) => Object.assign({ group: cass, tag: "cassette" }, x);
    M.cogs.forEach((n, g) => F.gear({ teeth: n, pitch: M.pitch, thick: M.cogThick, hole: 17.5, axis: "y" }, c({ mat: "machined", at: [0, M.cogY(g), 0] })));
    F.cyl({ r: 17.6, h: 44, n: 28, axis: "y" }, c({ mat: "darkSteel", at: [0, M.y0 - 6, 0] }));
    F.lathe([[10, 0], [16, 0], [16, 2.5], [10, 3.5]], { axis: "y", n: 24 }, c({ mat: "steel", at: [0, M.y0 - 5.5, 0] }));
    // frame
    const fr = (x) => o(Object.assign({ mat: "paint", tag: "frame", info: "frame" }, x));
    for (const s of [-1, 1]) {
      F.link([0, s * 67, 0], [bx, s * 34, bz], { w: 16, d: 14, r: 6 }, fr({}));                    // chainstay
      F.link([0, s * 67, 0], [bx - 150, s * 22, 470], { w: 13, d: 13, r: 6 }, fr({}));             // seatstay
      F.box({ w: 30, d: 6, h: 34, r: 5 }, fr({ at: [-4, s * 67, -17], mat: "steel", info: s < 0 ? "hanger" : "frame" }));   // dropout
    }
    F.link([bx, 0, bz], [bx - 150, 0, 470], { w: 30, d: 30, r: 14 }, fr({}));                      // seat tube
    F.link([bx, 0, bz], [bx + 260, 0, 190], { w: 36, d: 34, r: 16 }, fr({}));                      // down tube, cut short
    F.cyl({ r: 21, h: 68, n: 28, axis: "y" }, fr({ at: [bx, -34, bz] }));                          // bottom bracket shell
    F.cyl({ r: 5, h: 150, n: 14, axis: "y" }, o({ mat: "steel", tag: "frame", at: [0, -75, 0] }));  // axle
    F.box({ w: 14, d: 5, h: 30, r: 3 }, o({ mat: "castAl", tag: "dera", info: "hanger", at: [M.H[0] + 6, M.hangerY + 3, M.H[1] - 6], rot: [0, 0.6, 0] }));   // derailleur hanger
    // crank and chainring
    const crank = F.group({ group: B, at: [bx, 0, bz], info: "crank" }), k = (x) => Object.assign({ group: crank, tag: "crank" }, x);
    F.gear({ teeth: M.ring, pitch: M.pitch, thick: 2.2, hole: 52, axis: "y" }, k({ mat: "darkSteel", at: [0, M.ringY, 0], info: "chainring" }));
    for (let i = 0; i < 5; i++) { const a = i * 72 * D; F.link([0, M.ringY, 0], [62 * Math.cos(a), M.ringY, 62 * Math.sin(a)], { w: 10, d: 3, r: 1.2 }, k({ mat: "castAl" })); }
    F.cyl({ r: 9, h: 130, n: 16, axis: "y" }, k({ mat: "steel", at: [0, -65, 0] }));
    for (const s of [-1, 1]) { F.link([0, s * 60, 0], [0, s * 64, -s * M.crank], { w: 22, d: 10, r: 4 }, k({ mat: "castAl" })); F.box({ w: 70, d: 50, h: 12, r: 4 }, k({ mat: "plastic", at: [0, s * 93, -s * M.crank - 6], info: "pedal" })); }
    // derailleur. Fixed part: the b-knuckle on the hanger.
    const Hy = M.hangerY, H3 = [M.H[0], Hy, M.H[1]], d = (x) => o(Object.assign({ tag: "dera" }, x));
    F.cyl({ r: 8, h: 16, n: 20, axis: "y" }, d({ mat: "castAl", at: [H3[0], Hy - 5, H3[2]], info: "bknuckle" }));
    F.box({ w: 20, d: 12, h: 12, r: 3 }, d({ mat: "castAl", at: [H3[0] + 4, Hy + 3, H3[2] - 6], info: "bknuckle" }));
    F.cyl({ r: 3, h: 3, n: 6, axis: "y" }, d({ mat: "steel", at: [H3[0], Hy - 8, H3[2]], info: "bknuckle" }));
    for (const dz of [5, -3]) F.cyl({ r: 1.2, h: 9, n: 8, axis: "x" }, d({ mat: "steel", at: [H3[0] - 12, Hy + 2, H3[2] + dz], info: "limit", edges: false }));   // limit screws
    const stop = [H3[0] - 2, Hy - 2, H3[2] + 16];                                                    // cable stop on the b-knuckle
    F.cyl({ r: 2.6, h: 10, n: 12, axis: "x" }, d({ mat: "steel", at: [stop[0], stop[1], stop[2]], info: "cable" }));
    F.tube([[stop[0] + 10, stop[1], stop[2]], [40, -62, 14], [110, -52, -2], [bx - 60, -40, bz + 26]], 2.4, d({ mat: "plastic", info: "housing" }));
    // moving parts, placed each frame from the model
    const pm = (x) => d(Object.assign({ mat: "castAl" }, x));
    const linkA = F.link([0, 0, 0], [1, 0, 0], { w: 12, d: 4, r: 1.5 }, pm({ info: "para" })), linkB = F.link([0, 0, 0], [1, 0, 0], { w: 12, d: 4, r: 1.5 }, pm({ info: "para" }));
    const pk = F.group({ group: B, info: "pknuckle" });                                             // p-knuckle: translates, does not rotate
    const pkBody = F.box({ w: 18, d: 22, h: 14, r: 4 }, { mat: "castAl", tag: "dera", group: pk, at: [0, 4, -7] });
    F.cyl({ r: 6, h: 12, n: 16, axis: "y" }, { mat: "castAl", tag: "dera", group: pk, at: [0, 4, -M.hang] });
    F.link([0, 8, -4], [0, 8, -M.hang], { w: 10, d: 5, r: 2 }, { mat: "castAl", tag: "dera", group: pk });
    const spring = F.spring([0, 0, 0], [1, 0, 0], { r: 3.2, turns: 9, wire: 0.6 }, d({ mat: "steel", info: "spring" }));
    const cable = F.link([0, 0, 0], [1, 0, 0], { w: 1.3, d: 1.3, r: 0.6 }, d({ mat: "steel", info: "cable", edges: false }));
    const anchor = F.cyl({ r: 2.6, h: 4, n: 8, axis: "y" }, d({ mat: "steel", info: "anchor" }));
    const cage = [-5.5, 5.5].map((dy) => F.link([0, 0, 0], [1, 0, 0], { w: 9, d: 1.6, r: 0.7 }, pm({ mat: "darkSteel", info: "cage" })));
    const pulley = (info) => { const g = F.group({ group: B, info }); F.gear({ teeth: M.pulley, pitch: M.pitch, thick: 2.4, hole: 4, axis: "y" }, { mat: "plastic", tag: "dera", group: g }); F.cyl({ r: 4, h: 13, n: 12, axis: "y" }, { mat: "steel", tag: "dera", group: g, at: [0, -6.5, 0], edges: false }); return g; };
    const guide = pulley("guide"), tension = pulley("tension");
    const cageSpring = F.spring([0, 0, 0], [1, 0, 0], { r: 2.2, turns: 7, wire: 0.45 }, d({ mat: "steel", info: "cageSpring" }));
    const chain = F.chain({ count: M.links, pitch: M.pitch, width: 7, height: 8.4 }, o({ tag: "chain", info: "chain" }));

    // ---------- 4. what each part is ----------
    F.describe({
      wheel: { name: "Rear wheel", role: "The cassette drives it. One turn of the wheel moves the bike about two metres." },
      cassette: { name: "Cassette", role: "A stack of cogs fixed together on the hub. A small cog is a hard, fast gear. A big cog is an easy, slow gear.", fact: "8 cogs, 11 to 32 teeth, 4.8 mm apart.", src: "cogs" },
      chainring: { name: "Chainring", role: "The toothed ring on the cranks. Your legs turn it, and it pulls the chain." },
      crank: { name: "Crank", role: "The arm between the pedal and the chainring." },
      pedal: { name: "Pedal", role: "Where your foot pushes." },
      chain: { name: "Chain", role: "Carries the pull from the chainring to the cassette. It can bend sideways a little, and the derailleur uses that.", fact: "12.7 mm from pin to pin.", src: "pitch" },
      frame: { name: "Frame", role: "Holds the wheel, the cranks and the derailleur in place." },
      hanger: { name: "Derailleur hanger", role: "A tab under the right dropout. The derailleur bolts to it." },
      bknuckle: { name: "B-knuckle", role: "The upper body of the derailleur. It is bolted to the hanger and does not move when you shift." },
      para: { name: "Parallelogram links", role: "Two equal links that swing together. They carry the lower body sideways, and it stays parallel to the cogs." },
      pknuckle: { name: "P-knuckle", role: "The lower body. It rides on the two links and carries the cage." },
      spring: { name: "Return spring", role: "Pulls the parallelogram toward the small cogs. The cable works against it." },
      cable: { name: "Shift cable", role: "A steel wire from the shifter. A click of the shifter pulls it in or lets it out by a fixed amount." },
      housing: { name: "Cable housing", role: "The sleeve that the cable slides in." },
      anchor: { name: "Cable anchor", role: "The bolt that clamps the cable to the link. A pull here swings the links." },
      limit: { name: "Limit screws", role: "Two stops that keep the cage from going past the smallest or the biggest cog." },
      cage: { name: "Cage", role: "Two plates that hold the pulleys. It pivots and is sprung, so it swings to take up loose chain." },
      guide: { name: "Guide pulley", role: "The upper pulley. It sits just under the cogs and leads the chain sideways onto the next cog.", fact: "11 teeth.", src: "pulley" },
      tension: { name: "Tension pulley", role: "The lower pulley. It swings back with the cage to keep the chain tight.", fact: "11 teeth.", src: "pulley" },
      cageSpring: { name: "Cage spring", role: "Turns the cage backward. This is what takes up the slack when you are on a small cog." },
    });
    // Anchors are chosen so the pointed-at spot is in view in that stage. The audit lists any label whose spot is hidden.
    const Z = M.wheelR;
    F.label("wheel", { set: "bike", on: [-235, -16, Z + 235] }); F.label("chain", { set: "bike", on: [bx / 2, M.ringY - 4, Z + 62] }); F.label("chainring", { set: "bike", on: [bx + 46, M.ringY - 2, Z + bz - 46] }); F.label("pedal", { set: "bike" });
    F.label("cassette", { set: "bike", on: [-38, M.y0 + 32, Z + 42] }); F.label("guide", { set: "bike", text: "Rear derailleur", offset: [0, -8, 0] });
    F.label("cassette", { set: "dera", on: [-38, M.y0 + 32, Z + 42] }); for (const key of ["bknuckle", "para", "housing"]) F.label(key, { set: "dera" });
    F.label("pknuckle", { set: "dera", on: pkBody, offset: [0, -12, 0] }); F.label("guide", { set: "dera", offset: [0, -8, 0] }); F.label("tension", { set: "dera", offset: [0, -3, -19] }); F.label("cage", { set: "dera", on: cage[0], offset: [0, -2, 0] });
    for (const key of ["bknuckle", "para", "cable", "anchor", "cassette"]) F.label(key, { set: "para" });
    F.label("guide", { set: "cage", offset: [0, -8, 0] }); F.label("tension", { set: "cage", offset: [0, -3, -19] }); F.label("cage", { set: "cage", on: cage[0], offset: [0, -2, 0] }); F.label("chain", { set: "cage", on: [120, M.y0 - 2, Z - 150] });

    // ---------- 5. running ----------
    let hold = 0;
    F.onFrame((dt) => {
      if (state.demo) { hold += dt; if (hold > 2.4) { hold = 0; state.gear = state.gear === state.demo[0] ? state.demo[1] : state.demo[0]; syncGear(); } }
      state.g += (state.gear - state.g) * (F.reduced || F.snap ? 1 : 1 - Math.exp(-dt / 0.28)); if (Math.abs(state.gear - state.g) < 0.002) state.g = state.gear;
      const g = state.g, omega = F.reduced ? 0 : (M.cadence / 60) * 2 * Math.PI, teethPerSec = (omega / (2 * Math.PI)) * M.ring;
      state.theta += omega * dt; state.phase += teethPerSec * dt;
      const cogT = M.lerp(M.cogs, g), wC = omega * M.ring / cogT, wP = omega * M.ring / M.pulley;
      crank.rotation.y = state.theta; cass.rotation.y += wC * dt; wheel.rotation.y = cass.rotation.y; guide.rotation.y -= wP * dt; tension.rotation.y += wP * dt;
      // derailleur pose from the model
      const v = M.swing(g), y = M.cogY(g), psi = M.psi(g), G = M.guide(g), T = M.tension(g, psi);
      const b1 = [H3[0] + 6, Hy + 1, H3[2] + 4], b2 = [H3[0] + 6, Hy + 9, H3[2] - 4], add = (p) => [p[0] + v[0], p[1] + v[1], p[2] + v[2]], p1 = add(b1), p2 = add(b2);
      linkA.setEnds(b1, p1); linkB.setEnds(b2, p2); spring.setEnds(b1, p2);
      pk.position.set(H3[0] + v[0], y - 4, H3[2] + v[2]);
      const an = [b1[0] + v[0] * 0.55, b1[1] + v[1] * 0.55 - 3, b1[2] + v[2] * 0.55 + 5]; anchor.position.set(an[0], an[1] - 2, an[2]); cable.setEnds(stop, an);
      guide.position.set(G[0], y, G[1]); tension.position.set(T[0], y, T[1]);
      cage.forEach((m, i) => m.setEnds([G[0], y + (i ? 5.5 : -5.5), G[1]], [T[0], y + (i ? 5.5 : -5.5), T[1]]));
      cageSpring.setEnds([G[0], y + 9, G[1] + 14], [G[0] - 20 * Math.sin(psi), y + 9, G[1] - 20 * Math.cos(psi)]);
      chain.place(M.path(g, psi), state.phase);
      const n = Math.round(g);
      F.readout("gear " + (n + 1) + " of 8 · " + M.ring + " / " + M.cogs[n] + " teeth · wheel turns " + M.ratio(n).toFixed(2) + " times per pedal turn · cage at " + Math.round(psi / D) + "°");
    });

    // ---------- 6. stages ----------
    const box = (a, b) => new THREE.Box3(new THREE.Vector3(a[0], a[1], a[2] + M.wheelR), new THREE.Vector3(b[0], b[1], b[2] + M.wheelR));
    const ALL = ["wheel", "cassette", "frame", "crank", "dera", "chain"], near = box([-110, -90, -190], [110, 20, 80]);
    const STAGES = [
      { name: "Bike", set: "bike", demo: null, hint: "The back half of a bike. The chain runs from the chainring to the cassette and through the derailleur.", go() { F.ghost(ALL, 1); F.focus(box([-340, -100, -340], [bx + 180, 100, 340]), { azimuth: 30, elevation: 10, pad: 1.0 }); } },
      { name: "Drivetrain", set: "bike", demo: null, hint: "Without the wheel and frame: chainring, chain, cassette and derailleur. Press a gear button.", go() { F.ghost(ALL, 1); F.ghost("wheel", 0.04); F.ghost("frame", 0.1); F.focus(box([-130, -100, -210], [bx + 110, 60, 110]), { azimuth: 24, elevation: 10, pad: 1.0 }); } },
      { name: "Derailleur", set: "dera", demo: null, hint: "The derailleur hangs under the cassette. The upper body is fixed. The lower body and the cage move.", go() { F.ghost(ALL, 1); F.ghost("wheel", 0); F.ghost("frame", 0.08); F.ghost("crank", 0.15); F.focus(near, { azimuth: 34, elevation: 12, pad: 1.0 }); } },
      { name: "Sideways", set: "para", demo: [0, 7], hint: "From behind: the two links swing and carry the pulleys across the cassette. The cable gets shorter as it pulls.", go() { F.ghost(ALL, 1); F.ghost("wheel", 0); F.ghost(["frame", "crank"], 0.06); F.focus(box([-80, -90, -150], [60, 0, 70]), { azimuth: -62, elevation: 22, pad: 1.0 }); } },
      { name: "Slack", set: "cage", demo: [0, 7], hint: "From the side: a small cog uses less chain, so the cage swings back and takes up the slack.", go() { F.ghost(ALL, 1); F.ghost("wheel", 0); F.ghost(["frame", "crank"], 0.08); F.focus(box([-150, -80, -200], [130, -20, 80]), { azimuth: 2, elevation: 4, pad: 1.0 }); } },
    ];

    // ---------- 7. controls ----------
    const bar = document.createElement("div"); bar.className = "mech-controls";
    bar.innerHTML = STAGES.map((s, i) => `<button data-stage="${i}">${i + 1} ${s.name}</button>`).join("") + `<span class="sp"></span><span>Gear</span>` + M.cogs.map((t, i) => `<button data-gear="${i}" aria-label="Gear ${i + 1}, ${t} teeth">${i + 1}</button>`).join("") +
      `<span class="sp"></span><button data-t="labels" aria-pressed="${state.labels}">Labels</button><button data-t="lesson">Lesson: one shift</button><button data-t="quiz">Quiz</button><button data-t="style">${REAL ? "Line view" : "Real view"}</button>`;
    F.mount.querySelector(".mech-stage").after(bar);
    const hintEl = F.mount.querySelector(".mech-hint");
    function syncGear() { bar.querySelectorAll("[data-gear]").forEach((b, i) => b.setAttribute("aria-pressed", i === state.gear)); }
    function setGear(g) { state.demo = null; state.gear = Math.max(0, Math.min(7, g)); syncGear(); F.run(); }
    function setStage(i, quiet) { if (!quiet) F.touch(); state.stage = ((i % STAGES.length) + STAGES.length) % STAGES.length; const S = STAGES[state.stage]; S.go(); state.demo = S.demo; hold = 0; F.labels(state.labels ? S.set : null); hintEl.textContent = S.hint; bar.querySelectorAll("[data-stage]").forEach((b, n) => b.setAttribute("aria-pressed", n === state.stage)); }
    const step = (stage, demo) => () => { setStage(stage, true); state.demo = demo; if (demo) { state.gear = demo[0]; syncGear(); } hold = 0; };
    const lesson = F.lesson([
      { title: "1. A click pulls the cable", text: "The shifter pulls the cable in by a fixed amount. Watch the bare cable between the stop and the anchor bolt get shorter.", go: step(3, [2, 3]) },
      { title: "2. The links swing", text: "The cable pulls on one link. Both links swing together, so the lower body moves sideways and stays parallel to the cogs.", go: step(3, [1, 6]) },
      { title: "3. The guide pulley leads the chain", text: "The upper pulley moves to sit under the next cog. The chain bends sideways, and the turning cog picks it up.", go: step(2, [3, 4]) },
      { title: "4. The cage takes up the slack", text: "A smaller cog needs less chain. The cage spring swings the lower pulley back, and the chain stays tight.", go: step(4, [0, 7]) },
      { title: "5. Let the cable out", text: "A click the other way lets cable out. The return spring pulls the links back toward the small cogs.", go: step(3, [6, 1]) },
    ], { onClose: () => setStage(2, true) });
    const quiz = F.quiz([
      { ask: "Click the pulley that leads the chain onto the next cog.", key: "guide" },
      { ask: "Click a part that swings to carry the pulleys sideways.", key: "para" },
      { ask: "Click the part that keeps the chain tight on a small cog.", key: "tension", also: ["cage", "cageSpring"] },
      { ask: "Click the part that pulls the derailleur toward the small cogs.", key: "spring" },
      { ask: "Click the part of the derailleur that does not move when you shift.", key: "bknuckle" },
    ]);
    bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F.touch(); const t = b.dataset.t;
      if (b.dataset.stage) setStage(+b.dataset.stage); else if (b.dataset.gear) setGear(+b.dataset.gear); else if (t === "style") { state.style = REAL ? "line" : "real"; start(); } else if (t === "labels") { state.labels = !state.labels; b.setAttribute("aria-pressed", state.labels); F.labels(state.labels ? STAGES[state.stage].set : null); } else if (t === "lesson") lesson.open(0); else if (t === "quiz") { setStage(2); quiz.start(); } });
    F.stage.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= "5") setStage(+e.key - 1); });
    F.onPress = () => setStage(state.stage + 1);
    F.tour(() => setStage(state.stage + 1, true));

    mech.card("#fig", {
      fig: "Fig 4", title: "How a rear derailleur shifts gears",
      keys: [{ mark: "lit", label: "Click a part to learn what it does" }, { mark: "mid", label: "Gear buttons shift. Keys 1 to 5 change the view. Drag to orbit." }],
      caption: "An 8-speed bike with an 11 to 32 cassette. The derailleur does two jobs: the parallelogram moves the chain sideways, and the sprung cage keeps the chain tight. The cage angle is solved so that the chain always has the same " + M.links + " links. Simplified: the guide pulley sits on the cage pivot, the chain changes cogs smoothly and not tooth by tooth, and the bike and the derailleur dimensions are generic. Open Sources for where each number comes from.",
    });
    window.fig = F; window.setStage = setStage; window.state = state;
    syncGear(); setStage(state.stage, true); F.fit(true);
  }
  addEventListener("mech-theme", start);
  start();
})();
