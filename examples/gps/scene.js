/* How GPS finds where you are while you drive. Scene units are figure units, not to scale: the Earth is a ball 900 across in radius,
   the car is 100 long and the satellites sit about 500 above the road. x east, y north, z up at the top of the Earth.
   Two models run side by side. The scene model draws the picture: a car on a loop road, four satellites, the distance from each
   satellite to the car, and the ring on the ground where that distance holds. The real model gives every number in the readout:
   satellites 20,200 km up in the same directions as in the picture, a car at 30 km/h on a loop of 40 m radius, signals at the speed of light,
   and a position solved from four distances with an unknown receiver clock error. Sources are in the facts list. */
(function () {
  const D = Math.PI / 180;

  // ---------- 1. the model ----------
  const M = {
    // real world, km and s
    c: 299792.458,                 // speed of light, km/s (exact)
    Re: 6371,                      // mean Earth radius, km
    alt: 20200,                    // GPS orbit altitude, km
    loopR: 0.040,                  // the car's loop, km (40 m)
    kph: 30,                       // car speed
    every: 1,                      // one position fix a second
    clock: 0.25e-3,                // receiver clock error in the solver test, s (illustrative)
    // scene, figure units
    R: 900,                        // Earth radius in the picture
    loop: 160,                     // loop radius in the picture
    carScale: 1.3,                 // the car is drawn at this scale
    wheelR: 9, base: 64,           // wheel radius and wheelbase of the car, before carScale
    pulse: 300,                    // how fast a signal pulse moves in the picture, units a second
    colors: [0xf08c00, 0x7048e8, 0x0c8599, 0xd6336c],
  };
  M.v = M.kph / 3600;                                  // km/s
  M.omega = M.v / M.loopR;                             // rad/s round the loop, real time
  M.scale = M.loop / (M.loopR * 1000);                 // picture units per metre on the road
  M.Rs = M.Re + M.alt;
  M.O = [0, 0, -M.R];                                  // centre of the Earth in the picture

  // satellites in the picture: across the sky behind the car, as the camera sees it
  const AZ = 38 * D, RIGHT = [Math.cos(AZ), Math.sin(AZ), 0], BACK = [-Math.sin(AZ), Math.cos(AZ), 0];
  const SAT = [[-265, 40, 270], [-95, 200, 330], [115, 180, 315], [270, 30, 255]].map(([s, b, h]) => [RIGHT[0] * s + BACK[0] * b, RIGHT[1] * s + BACK[1] * b, h]);

  // small vector helpers
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = (a) => Math.sqrt(dot(a, a)), unit = (a) => mul(a, 1 / len(a));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  // a point on the Earth in the picture, from east and north offsets from the top
  M.ground = (x, y, lift = 0) => { const z = Math.sqrt(M.R * M.R - x * x - y * y) - M.R; const n = unit(sub([x, y, z], M.O)); return { p: add(M.O, mul(n, M.R + lift)), n }; };
  M.carAt = (th) => M.ground(M.loop * Math.cos(th), M.loop * Math.sin(th));

  // real model: the receiver frame is east, north, up, with the loop centre at the origin on the ground
  M.real = SAT.map((s) => {
    const top = M.ground(0, 0).p, d = unit(sub(s, top));
    const el = Math.asin(d[2]), az = Math.atan2(d[0], d[1]);
    const rho = -M.Re * Math.sin(el) + Math.sqrt((M.Re * Math.sin(el)) ** 2 + M.Rs * M.Rs - M.Re * M.Re);
    return { el, az, pos: mul(d, rho) };
  });
  M.carReal = (th) => [M.loopR * Math.cos(th), M.loopR * Math.sin(th), 0];
  M.range = (i, th) => len(sub(M.real[i].pos, M.carReal(th)));
  M.time = (i, th) => M.range(i, th) / M.c;
  // the receiver's job: find x, y, z and the clock error b from four pseudoranges p = |s - x| + c b (Gauss-Newton)
  M.solve = (sats, pr, withClock = true) => {
    let x = [0, 0, -2000], b = 0;
    for (let it = 0; it < 20; it++) {
      const rows = sats.map((s, k) => { const r = len(sub(x, s)), u = mul(sub(x, s), 1 / r); return { u, res: pr[k] - (r + b) }; });
      const n = withClock ? 4 : 3, A = rows.map((r) => (withClock ? [...r.u, 1] : r.u)), y = rows.map((r) => r.res);
      // normal equations, solved by Gauss elimination
      const N = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => A.reduce((s, a) => s + a[i] * a[j], 0)));
      const g = Array.from({ length: n }, (_, i) => A.reduce((s, a, k) => s + a[i] * y[k], 0));
      for (let i = 0; i < n; i++) { for (let j = i + 1; j < n; j++) { const f = N[j][i] / N[i][i]; for (let k = i; k < n; k++) N[j][k] -= f * N[i][k]; g[j] -= f * g[i]; } }
      const dx = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = g[i]; for (let k = i + 1; k < n; k++) s -= N[i][k] * dx[k]; dx[i] = s / N[i][i]; }
      x = add(x, dx.slice(0, 3)); if (withClock) b += dx[3];
    }
    return { x, b };
  };
  M.fix = (th, clock = M.clock) => { const pr = M.real.map((s, i) => M.range(i, th) + M.c * clock); return M.solve(M.real.map((s) => s.pos), pr); };
  // the ring in the picture: where the sphere of one distance round satellite i meets the Earth
  M.ring = (S, P) => {
    const d = len(sub(S, P)), v = sub(S, M.O), Dd = len(v), u = mul(v, 1 / Dd);
    const a = (M.R * M.R - d * d + Dd * Dd) / (2 * Dd), r = Math.sqrt(Math.max(0, M.R * M.R - a * a));
    const c = add(M.O, mul(u, a)), e1 = unit(sub(P, c)), e2 = cross(u, e1);
    return { c, r, u, e1, e2, d };
  };
  const fmt = (x, n = 0) => x.toLocaleString("en-US", { minimumFractionDigits: n, maximumFractionDigits: n });

  const state = { stage: 0, labels: true, th: -0.5, t: 0, since: 0, fixes: 0, trail: [], last: null, style: location.hash === "#line" ? "line" : "real" };
  let F = null;

  function start() {
    if (F) F.dispose();
    F = new mech.Figure("#fig", { theme: document.documentElement.dataset.theme || "dark", style: state.style, width: 760, height: 480, azimuth: 38, elevation: 24 });
    const REAL = state.style === "real", LIGHT = F.theme === "light";

    // ---------- facts ----------
    const GPSGOV = "https://archive.gps.gov/systems/gps/space/";
    const NOAA = "https://oceanservice.noaa.gov/facts/gps.html";
    const SEOS = "https://www.seos-project.uni-oldenburg.de/GPS/GPS-c01-p02.html";
    const NAVI = "https://gssc.esa.int/navipedia/index.php/GNSS_Basic_Observables";
    const NIST = "https://physics.nist.gov/cgi-bin/cuu/Value?c";
    F.facts([
      { id: "alt", claim: "GPS satellites fly about 20,200 km up.", status: "sourced", source: "GPS.gov, Space Segment", url: GPSGOV },
      { id: "twice", claim: "Each satellite circles the Earth twice a day.", status: "sourced", source: "GPS.gov, Space Segment", url: GPSGOV },
      { id: "radio", claim: "The satellites send radio signals to users.", status: "sourced", source: "GPS.gov, Space Segment", url: GPSGOV },
      { id: "four", claim: "At least four satellites are in view from almost anywhere on Earth.", status: "sourced", source: "GPS.gov, Space Segment", url: GPSGOV },
      { id: "fourdist", claim: "Once a receiver knows its distance from four or more satellites, it knows where it is.", status: "sourced", source: "NOAA, What is GPS?", url: NOAA },
      { id: "range", claim: "The signal's travel time multiplied by the speed of light gives the range to the satellite.", status: "sourced", source: "ESA Navipedia, GNSS Basic Observables", url: NAVI },
      { id: "c", claim: "Light, and so the radio signal, travels 299,792.458 km each second.", status: "sourced", source: "NIST, speed of light in vacuum", url: NIST },
      { id: "atomic", claim: "GPS satellites carry atomic clocks. A receiver's clock is far less exact.", status: "sourced", source: "SEOS, Global positioning through trilateration", url: SEOS },
      { id: "fourth", claim: "A fourth travel time lets the receiver correct its own clock error, so that all the distances meet at one point.", status: "sourced", source: "SEOS, Global positioning through trilateration", url: SEOS },
      { id: "times", claim: "Each signal takes about 0.07 s to arrive. The exact times and distances come from the model.", status: "model" },
      { id: "solve", claim: "The point where the four distances meet, solved from them with an unknown clock error.", status: "model" },
      { id: "rate", claim: "A new fix once a second.", status: "assumed", source: "A typical rate for a car or phone receiver." },
      { id: "scene", claim: "The loop road, the car speed, the satellite directions and the sizes in the picture.", status: "illustrative" },
    ]);

    // ---------- 2. parts ----------
    const R = M.R;
    // the Earth: a ball that fills the bottom of the view, sea with one patch of land
    const sphereArc = (rad, from, to, step) => { const pts = []; for (let a = from; a <= to + 1e-9; a += step) pts.push([rad * Math.sin(a * D), rad * Math.cos(a * D) - R]); return pts; };
    F.lathe([[0.01, R * Math.cos(80 * D) - R]].concat(sphereArc(R, 0, 80, 1).reverse()), { n: 128 }, { color: LIGHT ? 0x3a7fae : 0x2c5f82, mat: "flat", tag: "earth", info: "earth", edges: false, shadow: false });
    F.lathe(sphereArc(R + 0.4, 0, 21, 0.5).reverse(), { n: 128 }, { color: LIGHT ? 0x6aa344 : 0x4f7a3a, mat: "flat", tag: "earth", info: "earth", edges: false, side: "double", shadow: false });
    const ringArc = (rad, r0, r1, step) => { const pts = []; for (let r = r0; r <= r1 + 1e-9; r += step) pts.push([r, Math.sqrt(rad * rad - r * r) - R]); return pts; };
    F.lathe(ringArc(R + 0.8, M.loop - 36, M.loop + 36, 4).reverse(), { n: 160 }, { color: 0x2a2d33, mat: "rubber", tag: "road", info: "road", edges: false, side: "double", shadow: false });
    for (let k = 0; k < 24; k++) {                       // the centre line, dashed
      const a = (k / 24) * Math.PI * 2, g = M.ground(M.loop * Math.cos(a), M.loop * Math.sin(a), 0.9);
      const m = F.box({ w: 2.4, d: 16, h: 0.4 }, { color: 0xf1f1ee, mat: "rubber", tag: "road", info: "road", edges: false, shadow: false });
      m.position.set(...g.p); setBasis(m, [Math.cos(a), Math.sin(a), 0], g.n);
    }

    // the car: an original, generic hatchback. Local x forward, y left, z up, origin on the road under its centre.
    const car = F.group({ info: "car" }); car.scale.setScalar(M.carScale); const C = { group: car, tag: "car", info: "car" };
    const lower = mech.sweep([[50, 19, 6, 14, 3], [46, 22, 5, 19, 3.4], [30, 23, 5, 22, 4], [-30, 23, 5, 22, 4], [-46, 22, 5, 21, 3.4], [-50, 20, 6, 18, 3]], 40).map(([x, W, zb, zt, e]) => ({ x, pts: mech.superSection(W, zb, zt, e, 40) }));
    F.add(mech.loftGeo(lower), Object.assign({ color: LIGHT ? 0xf4f4f2 : 0xdedfe0, mat: "paint", edges: 40 }, C));
    const cabin = mech.sweep([[24, 19, 20, 22, 3], [12, 19, 20, 33, 3.2], [-26, 19, 20, 35, 3.4], [-44, 19.5, 20, 31, 3.2], [-47, 19.5, 20, 23, 3]], 32).map(([x, W, zb, zt, e]) => ({ x, pts: mech.superSection(W, zb, zt, e, 36) }));
    F.add(mech.loftGeo(cabin), Object.assign({ mat: "glass", edges: 40 }, C));
    F.box({ w: 40, d: 34, h: 1.6, r: 5 }, Object.assign({ color: LIGHT ? 0xf4f4f2 : 0xdedfe0, mat: "paint", at: [-16, 0, 34.4] }, C));   // roof panel
    for (const s of [-1, 1]) {
      F.box({ w: 1.4, d: 9, h: 3.4, r: 1 }, Object.assign({ mat: "light", at: [49.6, s * 13, 14] }, C));                                 // headlight
      F.box({ w: 1.2, d: 8, h: 3, r: 1 }, Object.assign({ color: 0xc92a2a, mat: "rubber", at: [-50.2, s * 14, 15] }, C));               // tail light
      F.box({ w: 6, d: 3, h: 3, r: 1 }, Object.assign({ color: 0x2a2d33, mat: "rubber", at: [16, s * 22.5, 21] }, C));                  // mirror
    }
    F.box({ w: 3, d: 40, h: 4, r: 1.5 }, Object.assign({ color: 0x2a2d33, mat: "rubber", at: [51, 0, 6] }, C));                         // bumpers
    F.box({ w: 3, d: 40, h: 4, r: 1.5 }, Object.assign({ color: 0x2a2d33, mat: "rubber", at: [-51.5, 0, 6] }, C));
    // the GPS receiver: a fin antenna on the roof, with the receiver under it
    const fin = F.add(mech.profileGeo([[0, 0], [11, 0], [9, 2], [3, 6.5], [0.5, 6.5], [0, 4]], 2.6), { color: 0x22252b, mat: "rubber", group: car, tag: "car", info: "receiver", at: [-36, 0, 36] });
    const ANT = [-31, 0, 41];
    const wheels = [];
    for (const x of [M.base / 2, -M.base / 2]) for (const s of [-1, 1]) {
      const steer = F.group({ group: car, at: [x, s * 18, M.wheelR] }), W = F.group({ group: steer });
      F.lathe([[5.6, -3.4], [8.2, -3.6], [9, -2.4], [9, 2.4], [8.2, 3.6], [5.6, 3.4]], { axis: "y", n: 28 }, { mat: "rubber", group: W, tag: "wheel", info: "car", edges: false });
      F.cyl({ r: 5.8, h: 5.8, n: 20, axis: "y" }, { mat: "machined", group: W, tag: "wheel", info: "car", at: [0, -2.9, 0] });
      F.box({ w: 9, d: 6.4, h: 1.6 }, { mat: "steel", group: W, tag: "wheel", info: "car", at: [0, 0, -0.8], edges: false });  // a spoke, so the turning shows
      wheels.push({ steer, W, front: x > 0 });
    }

    // the satellites: gold body, solar wings, and the antenna array that faces the Earth
    const sats = SAT.map((S, i) => {
      const g = F.group({ info: "sat" }), o = { group: g, tag: "sat", info: "sat", shadow: false };
      F.box({ w: 30, d: 30, h: 36, r: 1.5 }, Object.assign({ color: 0xd8a63a, mat: "flat", at: [0, 0, -18] }, o));
      F.box({ w: 32, d: 32, h: 3, r: 1 }, Object.assign({ mat: "castAl", at: [0, 0, -21] }, o));                         // antenna deck, Earth side
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; F.cyl({ r: 2, h: 7, n: 10 }, Object.assign({ mat: "machined", at: [Math.cos(a) * 9, Math.sin(a) * 9, -28] }, o)); }
      F.cyl({ r: 2, h: 7, n: 10 }, Object.assign({ mat: "machined", at: [0, 0, -28] }, o));
      for (const s of [-1, 1]) {
        F.cyl({ r: 1.4, h: 22, n: 10, axis: "y" }, Object.assign({ mat: "steel", at: [0, s > 0 ? 14 : -36, 0] }, o));    // boom
        F.box({ w: 34, d: 64, h: 1.6, r: 0.6 }, Object.assign({ color: 0x24366b, mat: "flat", at: [0, s * 66, -0.8] }, o));
        F.box({ w: 35.5, d: 1.2, h: 2.2 }, Object.assign({ mat: "castAl", at: [0, s * 34.5, -1.1] }, o));
        F.box({ w: 35.5, d: 1.2, h: 2.2 }, Object.assign({ mat: "castAl", at: [0, s * 97.5, -1.1] }, o));
        F.box({ w: 1, d: 63, h: 2 }, Object.assign({ mat: "castAl", at: [0, s * 66, -1] }, o));
      }
      g.position.set(...S); setBasis(g, unit(cross(RIGHT, unit(sub(S, M.O)))), unit(sub(S, M.O)));
      const ant = add(S, mul(unit(sub(S, M.O)), -33));
      return { g, S, ant, color: M.colors[i] };
    });

    // the signals: a line from each satellite to the car, and a pulse that runs down it
    const glowy = (m, c) => { m.material.emissive.setHex(c); m.material.emissiveIntensity = 0.15; return m; };
    const lines = sats.map((s) => glowy(F.link([0, 0, 0], [0, 0, 1], { w: 3.4, d: 3.4, r: 1.2 }, { color: s.color, tag: "line", info: "distance", edges: false, shadow: false }), s.color));
    const pulses = sats.map((s) => glowy(F.add(new THREE.SphereGeometry(5, 18, 12), { color: s.color, tag: "packet", info: "signal", edges: false, shadow: false }), s.color));
    // the rings on the ground: one tube per satellite, its points rewritten every frame
    const NS = 160, NR = 6, TUBE = 2.6;
    const rings = sats.map((s) => {
      const geo = new THREE.BufferGeometry(), idx = [];
      geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(NS * NR * 3), 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array(NS * NR * 3), 3));
      for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const a = i * NR + j, b = ((i + 1) % NS) * NR + j, c = ((i + 1) % NS) * NR + ((j + 1) % NR), d = i * NR + ((j + 1) % NR); idx.push(a, b, d, b, c, d); }
      geo.setIndex(idx);
      return glowy(F.add(geo, { color: s.color, tag: "ring", info: "ring", edges: false, shadow: false }), s.color);
    });
    const K = (R + 1.4) / R;
    function drawRing(mesh, S, P) {
      const r = M.ring(S, P), pos = mesh.geometry.attributes.position.array, nor = mesh.geometry.attributes.normal.array;
      const c = add(M.O, mul(sub(r.c, M.O), K)), rad = r.r * K;
      let best = -2, bestP = null; const view = viewDir();
      for (let i = 0; i < NS; i++) {
        const s = (i / NS) * Math.PI * 2, q = add(mul(r.e1, Math.cos(s)), mul(r.e2, Math.sin(s))), p = add(c, mul(q, rad));
        const facing = dot(unit(sub(p, M.O)), view);
        if (i % 4 === 0 && facing > best && len(sub(p, P)) > 70) { best = facing; bestP = p; }
        for (let j = 0; j < NR; j++) { const v = (j / NR) * Math.PI * 2, n = add(mul(q, Math.cos(v)), mul(r.u, Math.sin(v))), k = (i * NR + j) * 3; pos[k] = p[0] + n[0] * TUBE; pos[k + 1] = p[1] + n[1] * TUBE; pos[k + 2] = p[2] + n[2] * TUBE; nor[k] = n[0]; nor[k + 1] = n[1]; nor[k + 2] = n[2]; }
      }
      mesh.geometry.attributes.position.needsUpdate = true; mesh.geometry.attributes.normal.needsUpdate = true;
      mesh.geometry.computeBoundingSphere(); mesh.geometry.computeBoundingBox();
      return bestP;
    }
    // the fix: a map pin over the car where the four distances meet, and dots where the last fixes were
    const pin = F.group({ info: "fix" }); pin.scale.setScalar(1.8); const PO = { group: pin, tag: "fix", info: "fix", edges: false, shadow: false };
    F.cyl({ r: 0.9, h: 30, n: 8 }, Object.assign({ color: 0x2b2f36, mat: "rubber" }, PO));
    F.lathe([[0.01, 30], [5, 34], [9.5, 41], [10.5, 47], [9, 53], [5, 56.5], [0.01, 57.5]], { n: 28 }, Object.assign({ color: 0xe03131, mat: "flat" }, PO));
    F.cyl({ r: 3.6, h: 1.2, n: 18, axis: "y" }, Object.assign({ color: 0xffffff, mat: "rubber", at: [0, -11, 47] }, PO));
    const TRAIL = 10, dots = Array.from({ length: TRAIL }, () => F.cyl({ r: 8.5, h: 1.2, n: 20 }, { color: 0xe03131, mat: "flat", tag: "trail", info: "trail", edges: false, shadow: false }));
    const footing = F.cyl({ r: 7, h: 1, n: 24 }, { color: 0xe03131, mat: "rubber", tag: "fix", info: "fix", edges: false, shadow: false });   // where the pin meets the road

    // ---------- 3. what each part is ----------
    F.describe({
      earth: { name: "Earth", what: "The ground under the car, drawn much too small next to the satellites.", does: "Carries the car. Every distance ring is drawn on it.", src: "scene" },
      road: { name: "Road", what: "A loop of road, so the car can keep driving in view.", does: "Gives the car somewhere to go, so the fix has something to follow.", src: "scene" },
      car: { name: "Car", what: "A generic car, driving round the loop.", does: "Carries the GPS receiver.", fact: "30 km/h on a loop of 40 m radius, in real time. Both are made up for the picture.", src: "scene" },
      receiver: { name: "GPS receiver", what: "A radio receiver with a small antenna, here in the roof fin.", does: "Listens to the satellites and works out where the car is.", how: "It times how long each signal took to arrive, turns each time into a distance, and finds the one point that fits all four.", fact: "Four distances are enough to know where you are.", src: ["fourdist", "range"] },
      sat: { name: "GPS satellite", what: "One of the GPS satellites, about 20,200 km up.", does: "Sends a radio signal that carries the time it left.", how: "Atomic clocks on board keep that time exact.", fact: "Each one circles the Earth twice a day. At least four are in view from almost anywhere.", src: ["alt", "twice", "radio", "four", "atomic"] },
      signal: { name: "Radio signal", what: "A time mark in the satellite's radio signal.", does: "Carries the moment it left the satellite down to the car.", how: "It moves at the speed of light, so it arrives about 0.07 s later.", fact: "299,792.458 km each second.", src: ["c", "times"] },
      distance: { name: "Distance", what: "The distance the receiver measures to one satellite.", does: "Puts the car somewhere on a ring of places that far away.", how: "Travel time multiplied by the speed of light. It is a little off until the receiver corrects its own clock.", src: ["range", "c", "times"] },
      ring: { name: "Distance ring", what: "Every place on the ground that is exactly that far from one satellite.", does: "Tells the receiver the car is somewhere on this ring.", how: "With a perfect clock, three rings would cross at one point. The receiver's clock is a little off, so a fourth ring is needed to make them meet.", src: ["fourth", "solve"] },
      fix: { name: "Position fix", what: "The one point that fits all four distances.", does: "The receiver's best estimate of where the car is.", how: "A fourth distance also lets the receiver correct its own clock, so the rings meet at one point.", fact: "A new fix every second.", src: ["fourth", "solve", "rate"] },
      trail: { name: "Earlier fixes", what: "Where the last few fixes were.", does: "Shows the fix moving with the car.", src: ["rate", "solve"] },
    });
    F.label("earth", { set: "s1" }); F.label("car", { set: "s1" }); F.label("receiver", { set: "s1" }); F.label("sat", { set: "s1", on: sats[1].g });
    F.label("sat", { set: "s2", on: sats[0].g }); F.label("signal", { set: "s2", on: pulses[1] }); F.label("receiver", { set: "s2" });
    F.label("fix", { set: "s3", on: pin }); F.label("trail", { set: "s3", on: dots[3] }); F.label("receiver", { set: "s3" });
    const ringLabel = F.label("ring", { set: "s3", on: [0, 0, 0] });
    const nums = ["s1", "s2"].flatMap((set) => sats.map((s, i) => F.label("sat", { set, text: String(i + 1), on: add(s.S, mul(unit(sub(s.S, M.O)), 22)), pin: true, box: true })));
    const dist = sats.map(() => F.label("distance", { set: "s2", text: "", on: [0, 0, 0], pin: true, box: true }));

    // ---------- checks ----------
    const lapTimes = Array.from({ length: 24 }, (_, k) => (k / 24) * Math.PI * 2);
    const WR = M.wheelR * M.carScale;
    F.check("the wheels roll on the road without slipping", Math.abs((M.loop * M.omega / WR) * WR - M.loop * M.omega) < 1e-9 && Math.abs(wheels[0].steer.position.z * M.carScale - WR) < 1e-9, (M.loop * M.omega).toFixed(1) + " units a second round the loop");
    F.check("the car stays on the loop road", lapTimes.every((th) => Math.abs(Math.hypot(M.carAt(th).p[0], M.carAt(th).p[1]) - M.loop) < 1e-9));
    F.check("every ring passes through the car, all round the loop", lapTimes.every((th) => { const P = M.carAt(th).p; return SAT.every((S) => { const r = M.ring(S, P); const q = add(r.c, mul(r.e1, r.r)); return len(sub(q, P)) < 1e-6; }); }));
    F.check("each signal takes 64 to 90 ms, as it must from 20,200 km up", M.real.every((s, i) => M.time(i, 0) > 0.064 && M.time(i, 0) < 0.09), M.real.map((s, i) => (M.time(i, 0) * 1000).toFixed(2) + " ms").join(", "));
    const errs = lapTimes.map((th) => { const f = M.fix(th); return { e: len(sub(f.x, M.carReal(th))) * 1e6, b: Math.abs(f.b / M.c - M.clock) * 1e9 }; });
    F.check("four distances with an unknown clock error give the car's position, all round the loop", errs.every((e) => e.e < 1 && e.b < 1), "worst " + Math.max(...errs.map((e) => e.e)).toFixed(4) + " mm, clock to " + Math.max(...errs.map((e) => e.b)).toFixed(4) + " ns");
    const three = M.solve(M.real.slice(0, 3).map((s) => s.pos), M.real.slice(0, 3).map((s, i) => M.range(i, 0) + M.c * M.clock), false);
    F.check("with three satellites and a clock error the answer is wrong, so the fourth is needed", len(sub(three.x, M.carReal(0))) > 1, "off by " + fmt(len(sub(three.x, M.carReal(0))), 0) + " km");
    F.check("the fix trail dots are spaced one second of driving apart", Math.abs(M.omega * M.every * M.loop - M.v * M.every * 1000 * M.scale) < 1e-9);

    // ---------- 4. running ----------
    function viewDir() { const a = F.azimuth * D, e = F.elevation * D; return [Math.sin(a) * Math.cos(e), -Math.cos(a) * Math.cos(e), Math.sin(e)]; }
    function place(th) {
      const g = M.carAt(th), fwd = [-Math.sin(th), Math.cos(th), 0];
      car.position.set(...M.ground(M.loop * Math.cos(th), M.loop * Math.sin(th), 0.8).p); setBasis(car, fwd, g.n);
      car.updateMatrixWorld(true);
      return g;
    }
    function dropFix() {
      const f = M.fix(state.th), sx = f.x[0] * 1000 * M.scale, sy = f.x[1] * 1000 * M.scale;
      state.trail.unshift([sx, sy]); state.trail.length = Math.min(state.trail.length, TRAIL);
      state.fixes++; state.err = len(sub(f.x, M.carReal(state.th))) * 1e6;
      state.moved = state.last ? len(sub(f.x, state.last)) * 1000 : 0; state.last = f.x;
    }
    // the trail starts full, as if the car had been driving for a while
    for (let k = TRAIL; k >= 1; k--) { const th0 = state.th - k * M.omega * M.every; const f = M.fix(th0); state.trail.unshift([f.x[0] * 1000 * M.scale, f.x[1] * 1000 * M.scale]); state.last = f.x; }
    state.trail.length = TRAIL; state.fixes = 40; state.moved = M.v * M.every * 1000; state.err = 0;
    F.onFrame((dt) => {
      if (!F.reduced) { state.t += dt; state.th += M.omega * dt; state.since += dt; }
      if (state.since >= M.every) { state.since -= M.every; dropFix(); }
      const g = place(state.th), P = g.p;
      // wheels: roll by distance over radius, steer the front pair round the loop
      const steerA = Math.atan((M.base * M.carScale) / M.loop);
      for (const w of wheels) { if (!F.reduced) w.W.rotation.y += (M.loop * M.omega * dt) / (M.wheelR * M.carScale); w.steer.rotation.z = w.front ? steerA : 0; }
      const antW = car.localToWorld(new THREE.Vector3(...ANT)), Q = [antW.x, antW.y, antW.z];
      sats.forEach((s, i) => {
        lines[i].setEnds(s.ant, Q);
        const L = len(sub(Q, s.ant)), f = ((state.t * M.pulse) % L) / L;
        pulses[i].position.set(...add(s.ant, mul(sub(Q, s.ant), f)));
        const ml = add(s.ant, mul(sub(Q, s.ant), 0.42)); dist[i].world.set(...ml);
        const km = fmt(M.range(i, state.th), 0) + " km"; if (dist[i].el.textContent !== km) dist[i].text(km);
        const lp = drawRing(rings[i], s.S, P); if (i === 0 && lp) ringLabel.world.set(...lp);
      });
      // pin over the car, dots on the road where the last fixes were
      const fx = M.fix(state.th), fg = M.ground(fx.x[0] * 1000 * M.scale, fx.x[1] * 1000 * M.scale, 0.8);
      const up = add(fg.p, mul(fg.n, 36 * M.carScale)); pin.position.set(...up); setBasis(pin, unit(cross(fg.n, unit(cross(viewDir(), fg.n)))), fg.n);
      footing.position.set(...add(fg.p, mul(fg.n, 0.6))); setBasis(footing, [1, 0, 0], fg.n);
      dots.forEach((d, k) => { const p = state.trail[k]; if (!p) return; const q = M.ground(p[0], p[1], 0.9); d.position.set(...q.p); setBasis(d, [1, 0, 0], q.n); d.scale.setScalar(1 - k * 0.06); });
      // readout from the real model, at this instant
      const S = state.stage;
      if (S === 0) F.readout("car " + M.kph + " km/h · 4 GPS satellites in view, about " + fmt(M.alt) + " km up");
      else if (S === 1) F.readout("travel time × speed of light: " + M.real.map((s, i) => (i + 1) + ") " + (M.time(i, state.th) * 1000).toFixed(3) + " ms = " + fmt(M.range(i, state.th), 3) + " km").join("  "));
      else F.readout("fix " + state.fixes + ": four distances meet at one point, " + state.err.toFixed(1) + " mm from the car · moved " + state.moved.toFixed(1) + " m since the last fix · 1 fix a second");
    });

    // ---------- 5. stages ----------
    const B3 = (a, b) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b));
    const sky = B3([-260, -260, -30], [260, 260, 300]).union(new THREE.Box3().setFromPoints(SAT.map((s) => new THREE.Vector3(...s))));
    const STAGES = [
      { name: "Car", set: "s1", hint: "A car drives on the Earth. Four GPS satellites fly far overhead, about 20,200 km up. The picture is not to scale.",
        go() { F.ghost(["earth", "road", "car", "wheel", "sat"], 1); F.ghost(["line", "packet", "ring", "fix", "trail"], 0); F.focus(sky, { azimuth: 38, elevation: 22, pad: 0.94 }); } },
      { name: "Signals", set: "s2", hint: "Each satellite sends a signal that says when it left. The receiver times the trip: travel time × speed of light = distance.",
        go() { F.ghost(["earth", "road", "car", "wheel", "sat", "packet"], 1); F.ghost("line", 0.7); F.ghost(["ring", "fix", "trail"], 0); F.focus(sky, { azimuth: 38, elevation: 22, pad: 0.94 }); } },
      { name: "Position", set: "s3", hint: "Each distance puts the car somewhere on one ring. The four rings cross at one point, and that point is where the car is. As it drives, the crossing follows it.",
        go() { F.ghost(["earth", "road", "sat", "packet", "fix", "trail", "ring"], 1); F.ghost(["car", "wheel"], 0.45); F.ghost("line", 0.3); F.focus(B3([-300, -300, -40], [300, 300, 120]), { azimuth: 38, elevation: 40, pad: 0.92 }); } },
    ];

    // ---------- 6. controls ----------
    const bar = document.createElement("div"); bar.className = "mech-controls";
    bar.innerHTML = STAGES.map((s, i) => `<button data-stage="${i}">${i + 1} ${s.name}</button>`).join("") +
      `<span class="sp"></span><button data-t="labels" aria-pressed="${state.labels}">Labels</button><button data-t="style">${REAL ? "Line view" : "Real view"}</button>`;
    F.mount.querySelector(".mech-stage").after(bar);
    const hintEl = F.mount.querySelector(".mech-hint");
    function setStage(i, quiet) { if (!quiet) F.touch(); state.stage = ((i % STAGES.length) + STAGES.length) % STAGES.length; const S = STAGES[state.stage]; S.go(); F.shadow(0); F.labels(state.labels ? S.set : null); hintEl.textContent = S.hint; bar.querySelectorAll("[data-stage]").forEach((b, k) => b.setAttribute("aria-pressed", k === state.stage)); }
    bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F.touch(); const t = b.dataset.t;
      if (b.dataset.stage) setStage(+b.dataset.stage); else if (t === "style") { state.style = REAL ? "line" : "real"; start(); } else if (t === "labels") { state.labels = !state.labels; b.setAttribute("aria-pressed", state.labels); setStage(state.stage, true); } });
    F.stage.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= String(STAGES.length)) setStage(+e.key - 1); });
    F.onPress = () => setStage(state.stage + 1);
    F.tour(() => setStage(state.stage + 1, true));

    // ---------- 7. card ----------
    mech.card("#fig", {
      fig: "Fig 10", title: "How GPS finds where you are",
      keys: [{ mark: "lit", label: "Click a part to learn what it does" }, { mark: "mid", label: "One colour for each satellite: its signal, its distance and its ring" }],
      caption: "GPS satellites fly about 20,200 km up and send radio signals that say when they left. The receiver in the car times each signal, multiplies the time by the speed of light to get a distance, and finds the one point on Earth that fits all four distances. The fourth distance also lets it correct its own clock. This is a map of the idea, not to scale: the Earth, the car and the satellites are drawn at sizes that fit one picture, and each ring is drawn where that distance meets the ground in the picture. The numbers in the readout come from a model with the satellites 20,200 km up in the directions shown and a car at 30 km/h on a loop of 40 m radius, which runs in real time. The signal pulses are slowed down thousands of times so you can see them. The satellites are held still; real ones move, and the receiver allows for that. The loop road, the car speed and the satellite directions are made up for the picture, and one fix a second is a typical rate. Real receivers also correct for the air the signal passes through, which is left out. Open Sources for where each claim comes from.",
    });
    window.fig = F; window.setStage = setStage; window.state = state;
    setStage(state.stage, true); F.fit(true);
    // start each part at its stage opacity, so the first frame does not show the signals fading out
    F.parts.forEach((m) => { if (m.isMesh) { const t = m.userData.alphaTo; m.userData.alpha = t + (t > 0.5 ? -0.003 : 0.003); } });   // one tick from the target, so the kit snaps it there
  }

  // turn an object so its local x points along fwd and its local z along up
  function setBasis(obj, fwd, up) {
    const z = new THREE.Vector3(...up).normalize(), x0 = new THREE.Vector3(...fwd);
    const y = new THREE.Vector3().crossVectors(z, x0).normalize(), x = new THREE.Vector3().crossVectors(y, z);
    obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  }
  addEventListener("mech-theme", start);
  start();
})();
