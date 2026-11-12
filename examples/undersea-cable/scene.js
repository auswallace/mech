/* How a message crosses the ocean in an undersea cable. Three small scenes share one spot, and each stage shows one of them:
   1. a globe (radius 100 units) with a cable from New York to London and a pulse of light on it,
   2. a strip of sea floor with the cable and one repeater (not to scale),
   3. the cable cut open, layer by layer, in millimetres, next to a coin.
   x right, y away from the viewer, z up. Facts and their sources are in F.facts below. */
(function () {
  // ---------- 1. the model ----------
  const M = {
    km: 5600,              // great circle, London to New York (sourced)
    lightKmS: 200000,      // light in glass fibre, rule of thumb (sourced)
    gap: 100,              // km between repeaters: clear fibre allows runs of more than 100 km (sourced)
    cableMm: 25,           // typical deep sea cable diameter (sourced)
    coinMm: 24.257,        // US quarter (sourced)
    glassUm: 125,          // fibre glass with its cladding (sourced)
    cross: 3.2,            // seconds the drawing takes for one crossing
    ny: [40.71, -74.01], london: [51.51, -0.13],
    // stage 3 layers, outside in: [key, inner radius, outer radius, how far it reaches toward the cut end, x]. Radii between the outside and the fibres are illustrative.
    layers: [
      ["jacket", 9.6, 12.5, -22], ["mylar", 9.25, 9.6, -12], ["wires", 6.7, 9.25, 0], ["water", 6.25, 6.7, 12],
      ["poly", 4.1, 6.25, 22], ["copper", 3.1, 4.1, 32], ["jelly", 0, 3.1, 42],
    ],
    fibres: 8, fibreEnd: 64, back: -92,
  };
  M.oneWayMs = (M.km / M.lightKmS) * 1000;
  M.repeaters = Math.round(M.km / M.gap);
  M.slow = Math.round((M.cross * 1000) / M.oneWayMs);
  const state = { stage: 0, labels: true, style: location.hash === "#line" ? "line" : "real", u: 0 };
  let F = null;

  function start() {
    if (F) F.dispose();
    const theme = document.documentElement.dataset.theme || "dark", LIGHT = theme === "light";
    F = new mech.Figure("#fig", { theme, style: state.style, width: 760, height: 480, azimuth: 20, elevation: 18 });
    const REAL = state.style === "real", AMBER = 0xff7a00, GLOW = 0xff5000, V = THREE.Vector3;

    F.facts([
      { id: "distance", claim: "The great circle between London and New York is about 5,600 km.", status: "sourced", source: "Wikipedia, Submarine communications cable", url: "https://en.wikipedia.org/wiki/Submarine_communications_cable" },
      { id: "speed", claim: "Light in optical fibre travels at around 200,000 km per second.", status: "sourced", source: "Wikipedia, Optical fiber", url: "https://en.wikipedia.org/wiki/Optical_fiber" },
      { id: "time", claim: "So the light needs about 28 ms to cross one way (5,600 km at 200,000 km/s). A real cable is longer than the great circle, so it takes a little more.", status: "model" },
      { id: "core", claim: "Light is kept in the core of the fibre by total internal reflection.", status: "sourced", source: "Wikipedia, Optical fiber", url: "https://en.wikipedia.org/wiki/Optical_fiber" },
      { id: "glass", claim: "A single mode fibre is 125 µm across with its cladding, and 250 µm with its buffer coat.", status: "sourced", source: "Wikipedia, Optical fiber", url: "https://en.wikipedia.org/wiki/Optical_fiber" },
      { id: "hair", claim: "The fibres that carry the light are roughly as thin as a human hair.", status: "sourced", source: "TeleGeography, Submarine cable FAQs", url: "https://www2.telegeography.com/submarine-cable-faqs-frequently-asked-questions" },
      { id: "hose", claim: "For most of its way across the ocean, a cable is about as wide as a garden hose.", status: "sourced", source: "TeleGeography, Submarine cable FAQs", url: "https://www2.telegeography.com/submarine-cable-faqs-frequently-asked-questions" },
      { id: "diameter", claim: "Modern cables are typically about 25 mm across and weigh around 1.4 tonnes per km.", status: "sourced", source: "Wikipedia, Submarine communications cable", url: "https://en.wikipedia.org/wiki/Submarine_communications_cable" },
      { id: "coin", claim: "A US quarter is 24.26 mm across.", status: "sourced", source: "Wikipedia, Quarter (United States coin)", url: "https://en.wikipedia.org/wiki/Quarter_(United_States_coin)" },
      { id: "layers", claim: "A published cross-section of a cable's shore end has, from the outside in: polyethylene, Mylar tape, stranded steel wires, an aluminium water barrier, polycarbonate, a copper or aluminium tube, petroleum jelly, optical fibres. Deep sea sections have lighter armour.", status: "sourced", source: "Wikipedia, Submarine communications cable (cross section diagram)", url: "https://en.wikipedia.org/wiki/Submarine_communications_cable" },
      { id: "radii", claim: "The thickness of each layer inside the cable.", status: "illustrative", source: "Drawn to look right. Only the outside diameter is sourced." },
      { id: "amp", claim: "Modern repeaters boost the light with an erbium-doped fibre amplifier.", status: "sourced", source: "Wikipedia, Submarine communications cable", url: "https://en.wikipedia.org/wiki/Submarine_communications_cable" },
      { id: "gapNew", claim: "Today's very clear fibre allows runs of more than 100 km between repeaters.", status: "sourced", source: "Wikipedia, Submarine communications cable", url: "https://en.wikipedia.org/wiki/Submarine_communications_cable" },
      { id: "count", claim: "With one repeater every 100 km, a 5,600 km crossing would need about 56.", status: "model" },
      { id: "power", claim: "Repeaters are powered through the cable: often 3,000 to 15,000 V DC, sent from the shore.", status: "sourced", source: "Wikipedia, Submarine communications cable", url: "https://en.wikipedia.org/wiki/Submarine_communications_cable" },
      { id: "copperPower", claim: "Repeaters get their power over a copper layer in the cable, and the sea is the return path.", status: "sourced", source: "Hackaday, Optical repeaters for submarine cables", url: "https://hackaday.com/2023/08/08/under-the-sea-optical-repeaters-for-submarine-cables" },
      { id: "housing", claim: "Repeater housings are made of titanium or a beryllium copper alloy, and can lie up to 8,000 m deep.", status: "sourced", source: "Hackaday, Optical repeaters for submarine cables", url: "https://hackaday.com/2023/08/08/under-the-sea-optical-repeaters-for-submarine-cables" },
      { id: "floor", claim: "In the deep sea, cables lie directly on the ocean floor. Near the shore they are buried.", status: "sourced", source: "TeleGeography, Submarine cable FAQs", url: "https://www2.telegeography.com/submarine-cable-faqs-frequently-asked-questions" },
      { id: "fade", claim: "How fast the pulse fades between repeaters, and the size of the repeater next to the cable.", status: "illustrative" },
      { id: "land", claim: "The coastlines on the globe are a coarse sketch.", status: "illustrative" },
    ]);

    // ======================= scene 1: the globe =======================
    const R = 100, GZ = R + 6;
    const globe = F.group({ at: [0, 0, GZ] });
    // turn the earth so that the mid Atlantic faces the camera and north points up
    const ll = (lat, lon, r = R) => { const a = (lat * Math.PI) / 180, o = (lon * Math.PI) / 180; return new V(r * Math.cos(a) * Math.cos(o), r * Math.cos(a) * Math.sin(o), r * Math.sin(a)); };
    {
      const az = (20 * Math.PI) / 180, el = (26 * Math.PI) / 180;
      const d = new V(Math.sin(az) * Math.cos(el), -Math.cos(az) * Math.cos(el), Math.sin(el));
      const m = ll(44, -38, 1).normalize(), pole = new V(0, 0, 1);
      const nE = pole.clone().addScaledVector(m, -pole.dot(m)).normalize(), eE = new V().crossVectors(nE, m);
      const nW = pole.clone().addScaledVector(d, -pole.dot(d)).normalize(), eW = new V().crossVectors(nW, d);
      const A = new THREE.Matrix4().makeBasis(m, nE, eE), B = new THREE.Matrix4().makeBasis(d, nW, eW);
      globe.quaternion.setFromRotationMatrix(B.multiply(A.transpose()));
    }
    const ocean = F.add(new THREE.SphereGeometry(R, 72, 48), { color: LIGHT ? 0x3f82b8 : 0x1f4e70, mat: REAL ? "rubber" : undefined, tone: "mid", group: globe, tag: "globe", info: "ocean", edges: false });
        // land: dots on a grid, kept where a coarse coastline says there is land
    const LAND = [
      [[-168,66],[-162,70],[-156,71.3],[-141,69.6],[-128,70],[-115,68.5],[-95,72],[-82,73],[-80,68],[-90,64],[-94,59],[-90,57],[-82,55],[-80,51],[-78,58],[-77,62],[-70,61],[-64,60],[-61,56],[-56,52],[-60,48],[-66,45],[-70,43.5],[-70,41.7],[-74,40.5],[-76,38],[-76,35],[-81,31.5],[-80,27],[-80.5,25.2],[-82.5,28],[-84,30],[-89,30],[-94,29.5],[-97,26],[-97.5,22],[-96,19],[-91,18.5],[-90,21],[-87,21.5],[-88,16],[-84,15.5],[-83,11],[-79.5,9],[-77.5,8.5],[-80,7.5],[-83,8.5],[-86,11],[-88,13.3],[-92,14.5],[-95,16],[-100,17],[-105,20],[-106,23],[-109,24],[-112,29],[-114.5,31],[-112,26],[-110,23],[-112,24.5],[-115,28],[-117,32.5],[-120.5,34.5],[-124,40],[-124.5,46],[-125,49],[-130,54],[-134,58],[-140,60],[-147,61],[-152,59],[-158,57],[-164,55],[-162,59],[-166,61.5],[-165,64]],
      [[-80,73],[-70,70],[-62,66.5],[-66,62],[-75,64],[-80,64.5],[-85,70]],
      [[-73,78],[-60,82],[-30,83.5],[-20,81],[-18,76],[-22,70],[-32,68],[-40,65],[-43,60],[-48,61],[-52,65],[-54,69],[-58,75.5],[-68,76.5]],
      [[-24,65.5],[-22,66.4],[-16,66.5],[-13.5,65.2],[-15,64.3],[-18.5,63.4],[-22.5,63.8]],
      [[-5.7,50],[1.4,51.2],[1.7,52.7],[0,53.5],[-0.2,54.5],[-1.6,55.6],[-2,57],[-1.8,57.6],[-3.5,58.6],[-5,58.6],[-6.2,57.3],[-5.5,56],[-4.8,54.8],[-3.2,54.2],[-3,53.3],[-4.6,52.8],[-5.2,51.7],[-3.5,51.4]],
      [[-6,52],[-6.2,54],[-5.5,54.5],[-7.4,55.3],[-8.5,54.4],[-10,54],[-10.2,51.6],[-8,51.6]],
      [[-9.5,43],[-9,39],[-9,37],[-7.5,37],[-6,36],[-2,36.7],[0,38.7],[0.5,40.5],[3.2,42],[3,43.3],[6,43],[8.5,44.3],[10.5,43],[12.5,41.5],[15.6,38],[16,39.5],[18.5,40.2],[16,41.5],[13.5,44.5],[12.3,45.3],[13.7,45.6],[15,44.5],[19,42],[19.5,40],[21,38.3],[22.8,36.5],[24,38],[23,40],[26,40.8],[29,41],[28,43],[29.5,45.2],[31,46.6],[33.5,44.5],[36.5,45.2],[38,47],[40,47],[45,50],[45,68],[40,67.5],[33,69.3],[28,71],[23,70.7],[19,70],[16,68.6],[14,67],[11,64.7],[7,62.6],[5,61],[5.5,58.9],[8,58],[10.5,57.6],[8.2,56.5],[8.6,53.9],[7,53.4],[4.5,52.5],[3.2,51.3],[1.6,50.9],[0,49.7],[-1.5,49.6],[-1.8,48.6],[-4.7,48.4],[-2.5,47.3],[-1.2,46],[-1.5,43.4],[-8,43.7]],
      [[-17,21],[-16,24.5],[-13,27.8],[-9.8,30],[-9.6,33],[-6,35.8],[-2,35.1],[3,36.8],[10,37.2],[11,35],[10,34],[11.5,33],[15,32.3],[20,30.8],[20,32.5],[23,32.6],[29,31],[32.3,31.3],[34,31.3],[34.5,28],[32.5,30],[33.5,27],[35.5,24],[37,21],[38.5,18],[40,15.5],[43,12.7],[51,11.8],[51,10.4],[48,4.5],[42,-1],[40,-5],[39,-8],[40.5,-15],[35,-20],[35.5,-24],[32.8,-26],[32,-29],[27.5,-33.5],[20,-34.8],[18.4,-34],[17,-29],[15,-27],[14.5,-23],[12,-17],[13.5,-12],[12.2,-6],[9,-1],[9.5,3.5],[8.5,4.5],[6,4.3],[2,6.3],[-2,4.8],[-7.5,4.4],[-11,6.8],[-13.5,9.5],[-15,11],[-17,14.7],[-16.5,19]],
      [[26,40.5],[26.3,38.3],[28,36.7],[36,36.5],[35,33],[34.3,31.3],[34.9,29.5],[37,26],[39,21.5],[42.7,16.5],[43.3,12.7],[45,13],[52,16],[57,18.8],[59.8,22.5],[56.5,24.5],[56,26.4],[51.5,24],[50.2,26.5],[48,29.5],[50,30],[53,27],[57,25.7],[61,25.2],[66,25.3],[68,23.7],[72,21],[73,16],[77,8],[80,15],[87,21],[92,22],[95,16],[98,10],[100,13],[100,72],[70,73],[60,69.5],[45,68.3],[45,50],[40,47],[41.5,41.5],[36,41.5],[31,41.2],[29,41]],
      [[-77,8.5],[-72,12],[-63,10.7],[-60,8.5],[-52,5],[-50,0],[-44,-2.5],[-35,-5.3],[-35,-9],[-39,-15],[-41,-22],[-48,-25.5],[-53,-34],[-58,-38],[-62,-39],[-65,-42],[-67,-46],[-69,-51],[-68.5,-54.5],[-74,-52],[-75,-46],[-73.5,-37],[-71.5,-30],[-70.3,-18],[-76,-14],[-81,-6],[-80,-1],[-80,1],[-78,4]],
    ];
    const inside = (lon, lat, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c; } return c; };
    {
      const pos = [], idx = [], STEP = 1.9, n = 7, h = 1.1, rr = 0.72;
      for (let lat = -58; lat <= 84; lat += STEP) {
        const dl = STEP / Math.max(0.25, Math.cos((lat * Math.PI) / 180));
        for (let lon = -170; lon <= 100; lon += dl) {
          if (!LAND.some((P) => inside(lon, lat, P))) continue;
          const c = ll(lat, lon, 1).normalize(), t1 = new V(-c.y, c.x, 0).normalize(), t2 = new V().crossVectors(c, t1), base = pos.length / 3;
          for (const r of [R - 0.3, R + h]) for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, p = c.clone().multiplyScalar(r).addScaledVector(t1, Math.cos(a) * rr * STEP).addScaledVector(t2, Math.sin(a) * rr * STEP); pos.push(p.x, p.y, p.z); }
          pos.push(...c.clone().multiplyScalar(R + h).toArray());
          const top = base + 2 * n;
          for (let k = 0; k < n; k++) { const k2 = (k + 1) % n; idx.push(base + n + k, base + n + k2, top, base + k, base + k2, base + n + k2, base + k, base + n + k2, base + n + k); }
        }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      F.add(g, { color: LIGHT ? 0xf4efe2 : 0xc9c2ae, mat: REAL ? "rubber" : undefined, tone: "hi", group: globe, tag: "globe", info: "land", edges: false });
      globe.children[globe.children.length - 1].material.color.setHex(LIGHT ? 0xf4efe2 : 0xc9c2ae);
    }
    // the cable: the great circle from New York to London, just above the surface
    const gc = (t, r) => { const a = ll(...M.ny, 1).normalize(), b = ll(...M.london, 1).normalize(), w = a.angleTo(b); return a.clone().multiplyScalar(Math.sin((1 - t) * w) / Math.sin(w)).addScaledVector(b, Math.sin(t * w) / Math.sin(w)).multiplyScalar(r); };
    const arc = Array.from({ length: 41 }, (_, k) => gc(k / 40, R + 1.5).toArray());
    F.tube(arc, 1.3, { mat: REAL ? "darkSteel" : undefined, color: REAL ? 0x1d1f23 : undefined, tone: "lo", group: globe, tag: "globe", info: "route" });
    const trail = F.tube(Array.from({ length: 41 }, (_, k) => gc(k / 40, R + 1.8).toArray()), 2.3, { color: AMBER, group: globe, tag: "packet", info: "pulse", shadow: false, n: 12 });
    trail.material.emissive.setHex(GLOW).multiplyScalar(0.18); const trailSegs = trail.geometry.index.count / (12 * 6);
    const city = (lat, lon, key) => {
      const g = F.group({ group: globe, info: key }), c = ll(lat, lon, 1).normalize();
      g.position.copy(c.clone().multiplyScalar(R - 0.5)); g.quaternion.setFromUnitVectors(new V(0, 0, 1), c);
      F.cyl({ r: 0.7, h: 9, n: 12 }, { mat: "steel", group: g, tag: "globe" });
      const head = F.add(new THREE.SphereGeometry(2.8, 18, 12), { color: LIGHT ? 0x2a2c30 : 0xededed, mat: REAL ? "plastic" : undefined, at: [0, 0, 9.6], group: g, tag: "globe", edges: false });
      head.material.color.setHex(LIGHT ? 0x2a2c30 : 0xededed);
      return head;
    };
    const nyHead = city(...M.ny, "ny"), lonHead = city(...M.london, "london");
    // the pulse of light, with a short tail
    const pulse = []; for (let k = 0; k < 1; k++) { const m = F.add(new THREE.SphereGeometry(5, 20, 14), { color: AMBER, group: globe, tag: "packet", info: "pulse", edges: false, shadow: false }); m.material.emissive.setHex(GLOW).multiplyScalar(0.45); pulse.push(m); }

    // ======================= scene 2: the sea floor =======================
    // units are made up. The cable is drawn far thicker than real, so you can see it.
    const sea = F.group({ at: [0, 0, 0] });
    const FLOOR = 10, CR = 2.4, RX = -10, RL = 52, RR = 7.5;
    const floor = F.box({ w: 280, d: 110, h: FLOOR, r: 4 }, { color: LIGHT ? 0xcdb98f : 0x6d5f45, mat: REAL ? "rubber" : undefined, tone: "hi", group: sea, tag: "sea", info: "seabed" });
    floor.material.color.setHex(LIGHT ? 0xcdb98f : 0x6d5f45);
    // a few stones and ripples so the floor reads as ground
    [[-96, 30, 5], [-60, -34, 3.6], [44, 36, 4.4], [100, -26, 5.4], [118, 30, 3], [-120, -8, 3.2]].forEach(([x, y, s]) => { const m = F.add(new THREE.SphereGeometry(s, 14, 10), { color: LIGHT ? 0xa49778 : 0x51483a, mat: REAL ? "rubber" : undefined, tone: "mid", at: [x, y, FLOOR], group: sea, tag: "sea", info: "seabed", edges: false }); m.scale.set(1.3, 1, 0.55); m.material.color.setHex(LIGHT ? 0xa49778 : 0x51483a); });
    for (let k = 0; k < 7; k++) { const y = -46 + k * 15; const m = F.tube(Array.from({ length: 9 }, (_, i) => [-136 + i * 34, y + 2.4 * Math.sin(i * 1.3 + k), FLOOR - 0.15]), 0.5, { color: LIGHT ? 0xbfab80 : 0x5e523c, mat: REAL ? "rubber" : undefined, group: sea, tag: "sea", info: "seabed" }); m.material.color.setHex(LIGHT ? 0xbfab80 : 0x5e523c); }
    // the cable path: lying on the floor, rising into the repeater's tapered ends
    const zc = (x) => { const d = Math.max(0, Math.abs(x - (RX + RL / 2)) - RL / 2); return FLOOR + CR - 0.25 + (RR - CR) * Math.exp(-(d * d) / 160); };
    const seaY = (x) => { const d = Math.max(0, Math.abs(x - (RX + RL / 2)) - RL / 2); return 7 * Math.sin((x - RX - RL / 2) / 60) * (1 - Math.exp(-(d * d) / 900)); };
    const seaPath = (x) => [x, seaY(x), zc(x)];
    const seaPts = []; for (let x = -140; x <= 140; x += 5) seaPts.push(seaPath(x));
    F.tube(seaPts.filter((p) => p[0] < RX + 2), CR, { mat: REAL ? "plastic" : undefined, tone: "lo", group: sea, tag: "sea", info: "cable2" });
    F.tube(seaPts.filter((p) => p[0] > RX + RL - 2), CR, { mat: REAL ? "plastic" : undefined, tone: "lo", group: sea, tag: "sea", info: "cable2" });
    const rep = F.group({ at: [RX, 0, FLOOR + RR - 0.25], group: sea, info: "repeater" });
    const repBody = F.lathe([[CR + 0.2, -4], [CR + 0.6, 0], [RR * 0.62, 6], [RR, 9], [RR, RL - 9], [RR * 0.62, RL - 6], [CR + 0.6, RL], [CR + 0.2, RL + 4]], { axis: "x", n: 40 }, { mat: "steel", group: rep, tag: "sea", at: [0, 0, 0] });
    for (const x of [12, RL - 12]) F.torus({ R: RR + 0.05, r: 0.55, axis: "x" }, { mat: "darkSteel", at: [x, 0, 0], group: rep, tag: "sea" });
    F.check("the repeater sits on the sea floor", Math.abs(FLOOR + RR - 0.25 - RR - FLOOR) < 0.5);
    F.check("the cable touches the floor away from the repeater", Math.abs(zc(-120) - CR - FLOOR) < 0.5 && Math.abs(zc(120) - CR - FLOOR) < 0.5);
    const water = F.box({ w: 280, d: 110, h: 26, r: 4 }, { color: LIGHT ? 0x3f8fd0 : 0x2f6d96, mat: REAL ? "glass" : undefined, at: [0, 0, FLOOR], group: sea, tag: "water", edges: 30, shadow: false });
    water.material.color.setHex(LIGHT ? 0x3f8fd0 : 0x2f6d96);
    const seaPulse = [F.add(new THREE.SphereGeometry(CR * 1.45, 18, 12), { color: AMBER, group: sea, tag: "packet", info: "pulse", edges: false, shadow: false })];
    const sleeve = F.tube(seaPts, CR * 1.3, { color: AMBER, group: sea, tag: "packet", info: "pulse", shadow: false, n: 12 }), sleeveSegs = sleeve.geometry.index.count / 72;

    // ======================= scene 3: the cable, cut open =======================
    // millimetres. Outside diameter and fibre size are sourced. The other radii are drawn to look right.
    const cut = F.group({ at: [0, 0, 0] });
    const DESK = 3, CZ = DESK + M.cableMm / 2;
    const desk = F.box({ w: 200, d: 100, h: DESK, r: 3 }, { color: LIGHT ? 0xe6e2da : 0x2b2b2d, mat: REAL ? "rubber" : undefined, tone: "hi", group: cut, tag: "cut", info: "desk" });
    desk.material.color.setHex(LIGHT ? 0xe6e2da : 0x2b2b2d);
    const L = {};
    // each inner layer starts a little way under the layer outside it, so the hidden part stays short
    const x0 = (i) => (i === 0 ? M.back : M.layers[i - 1][3] - 8);
    const tubeLayer = (key, ri, ro, x1, opts, b) => F.lathe([[ri, 0], [ro, 0], [ro, x1 - b], [ri, x1 - b], [ri, 0]].map(([r, h]) => [Math.max(r, 0.001), h]), { axis: "x", n: 56 }, Object.assign({ at: [b, 0, CZ], group: cut, tag: "cut", info: key, edges: 40 }, opts));
    const LOOK = {
      jacket: { color: LIGHT ? 0x2c2d31 : 0x1c1d20, mat: "rubber" }, mylar: { mat: "chrome" }, water: { mat: "castAl" },
      poly: { color: LIGHT ? 0xe9e6dc : 0xd8d4c8, mat: "rubber" }, copper: { color: 0xc8794a, mat: "brass" }, jelly: { color: 0xe8c66a, mat: "glass" },
    };
    for (const [i, [key, ri, ro, x1]] of M.layers.entries()) {
      if (key === "wires") continue;
      const o = LOOK[key], m = key === "jelly" ? F.cyl({ r: ro, h: x1 - x0(i), n: 40, axis: "x" }, { at: [x0(i), 0, CZ], group: cut, tag: "cut", info: key, edges: 40 }) : tubeLayer(key, ri, ro, x1, {}, x0(i));
      if (REAL) { if (o.mat) { const base = mech.MATS[o.mat]; m.material.metalness = base.metal; m.material.roughness = base.rough; } if (o.color !== undefined) m.material.color.setHex(o.color); else m.material.color.setHex(mech.MATS[o.mat].color); }
      if (key === "jelly" && REAL) { m.material.color.setHex(0xe2b75a); m.material.metalness = 0; m.material.roughness = 0.15; }
      L[key] = m;
    }
    // stranded steel wires: one ring of wires laid in a long helix
    const W = M.layers.find((l) => l[0] === "wires"), wireR = (W[2] - W[1]) / 2, ringR = (W[1] + W[2]) / 2, nWires = Math.floor((Math.PI * 2 * ringR) / (wireR * 2.05));
    for (let i = 0; i < nWires; i++) {
      const pts = []; for (let k = 0; k <= 16; k++) { const xs = x0(2), x = xs + (k / 16) * (W[3] - xs), a = (i / nWires) * Math.PI * 2 + (x - M.back) / 70; pts.push([x, ringR * Math.cos(a), CZ + ringR * Math.sin(a)]); }
      F.tube(pts, wireR * 0.97, { mat: "steel", n: 10, group: cut, tag: "cut", info: "wires" });
    }
    // end caps of the wires so the cut face reads as a ring of round wires
    // glass fibres: drawn about 3 times thicker than their 250 µm coat, so you can see them
    const fibreR = 0.36, fibres = [];
    for (let i = 0; i < M.fibres; i++) {
      const a = (i / M.fibres) * Math.PI * 2 + 0.2, r0 = 1.5, pts = [];
      for (let k = 0; k <= 4; k++) { const xs = x0(6) + 1, x = xs + (k / 4) * (M.layers[6][3] - xs); pts.push([x, r0 * Math.cos(a), CZ + r0 * Math.sin(a)]); }
      for (let k = 1; k <= 8; k++) { const f = k / 8, x = M.layers[6][3] + f * (M.fibreEnd - M.layers[6][3] - (i % 3) * 2.5), r = r0 + f * f * 3.2; pts.push([x, r * Math.cos(a), CZ + r * Math.sin(a) - f * f * 1.2]); }
      const m = F.tube(pts, fibreR, { color: LIGHT ? 0xbfe3ee : 0xcfeaf2, mat: REAL ? "chrome" : undefined, n: 8, group: cut, tag: "cut", info: "fibre" });
      m.material.color.setHex(LIGHT ? 0x9fd3e4 : 0xcfeaf2); m.material.metalness = 0.2; m.material.roughness = 0.2;
      const tip = F.add(new THREE.SphereGeometry(fibreR * 1.6, 12, 8), { color: AMBER, at: pts[pts.length - 1], group: cut, tag: "cut", info: "fibre", edges: false, shadow: false });
      fibres.push({ m, tip, curve: new THREE.CatmullRomCurve3(pts.map((p) => new V(...p)), false, "centripetal") });
    }
    const fibrePulse = F.add(new THREE.SphereGeometry(fibreR * 2.8, 12, 8), { color: AMBER, group: cut, tag: "packet", info: "pulse", edges: false, shadow: false });
    fibrePulse.material.emissive.setHex(GLOW);
    // a coin standing on its edge beside the cable
    const COIN_X = -24, COIN_Y = -32;
    const coin = F.cyl({ r: M.coinMm / 2, h: 1.75, n: 64, axis: "x" }, { mat: "castAl", at: [COIN_X, COIN_Y, DESK + M.coinMm / 2], group: cut, tag: "cut", info: "coin", edges: 40 });
    if (REAL) { coin.material.color.setHex(0xd4d7db); coin.material.metalness = 0.55; coin.material.roughness = 0.32; }
    F.torus({ R: M.coinMm / 2 - 0.9, r: 0.35, axis: "x" }, { mat: "steel", at: [COIN_X + 1.8, COIN_Y, DESK + M.coinMm / 2], group: cut, tag: "cut", info: "coin" });
    F.check("the cable is 25 mm across", Math.abs(M.layers[0][2] * 2 - M.cableMm) < 0.01, M.layers[0][2] * 2 + " mm");
    F.check("the coin and the cable stand on the desk", Math.abs(CZ - M.cableMm / 2 - DESK) < 0.01 && Math.abs(coin.position.z - M.coinMm / 2 - DESK) < 0.01);
    F.check("each layer fits inside the one outside it", M.layers.every((l, i) => l[1] < l[2] && (i === 0 || Math.abs(l[2] - M.layers[i - 1][1]) < 1e-6)));
    F.check("each layer reaches further than the one outside it", M.layers.every((l, i) => i === 0 || l[3] > M.layers[i - 1][3]) && M.fibreEnd > M.layers[6][3]);
    F.check("fibres sit inside the jelly", 1.5 + fibreR < M.layers[6][2]);
    F.check("one-way time is 28 ms", Math.abs(M.oneWayMs - 28) < 0.01, M.oneWayMs);
    F.check("repeater count from spacing", M.repeaters === 56, M.repeaters);

    // the light is a deep orange: matte, with little studio reflection, so it does not wash out to cream
    for (const m of [trail, ...pulse, sleeve, ...seaPulse, fibrePulse, ...fibres.map((f) => f.tip)]) if (m.material.isMeshStandardMaterial) { m.material.roughness = 0.9; m.material.metalness = 0; m.material.envMapIntensity = 0.15; }

    // ---------- 3. what each part is ----------
    F.describe({
      ny: { name: "New York", what: "One end of the cable.", does: "Equipment on shore turns data into flashes of light and sends them into the cable.", how: "The cable comes ashore on the coast, then runs on land to a station." },
      london: { name: "London", what: "The other end.", does: "Equipment on shore turns the light back into data.", how: "The cable comes ashore on the coast, and the data goes on to the city over land.", fact: "About 5,600 km from New York along the great circle.", src: "distance" },
      route: { name: "Cable", what: "A cable on the sea floor across the North Atlantic.", does: "It carries the message as pulses of light in thin glass fibres.", how: "A real cable takes a longer route than this great circle.", fact: "At about 200,000 km/s, light needs about 28 ms to cross one way.", src: ["speed", "distance", "time"] },
      pulse: { name: "Pulse of light", what: "One flash of light inside a glass fibre.", does: "A message is sent as many such flashes, on and off, very fast.", how: "The glass keeps the light inside by total internal reflection.", fact: "Light in fibre moves at about 200,000 km per second.", src: ["speed", "core"] },
      ocean: { name: "Atlantic Ocean", what: "The ocean the cable crosses.", does: "The cable lies on its floor, kilometres down.", src: ["floor", "housing"] },
      land: { name: "Land", what: "The continents, sketched coarsely.", does: "They show where the cable starts and ends.", src: "land" },
      seabed: { name: "Sea floor", what: "The bottom of the ocean.", does: "In deep water the cable simply lies on it. Near the shore it is buried.", src: "floor" },
      cable2: { name: "Cable", what: "The cable, drawn much thicker than real here.", does: "It carries the light and the power for the repeaters.", fact: "About 25 mm across, like a garden hose.", src: ["diameter", "hose"] },
      repeater: { name: "Repeater", what: "A sealed metal case spliced into the cable.", does: "It boosts the light, which gets weaker as it travels through the glass.", how: "An erbium-doped fibre amplifier strengthens the light. Power comes from shore through the cable.", fact: "Clear fibre allows more than 100 km between repeaters: about 56 on a 5,600 km crossing at that spacing.", src: ["amp", "gapNew", "count", "power", "housing"] },
      jacket: { name: "Plastic jacket", what: "The outer layer of polyethylene.", does: "It seals the cable from sea water.", src: "layers" },
      mylar: { name: "Mylar tape", what: "A thin wrap of plastic tape.", does: "It holds the layers under it together.", src: "layers" },
      wires: { name: "Steel wires", what: "Strands of steel wound round the core.", does: "They make the cable strong enough to be laid from a ship.", src: "layers" },
      water: { name: "Aluminium barrier", what: "A thin layer of aluminium.", does: "It keeps water out of the core.", src: "layers" },
      poly: { name: "Polycarbonate", what: "A layer of hard plastic.", does: "It protects the core.", src: "layers" },
      copper: { name: "Copper tube", what: "A metal tube round the fibres.", does: "It carries the electric power for the repeaters.", how: "Shore stations push a high DC voltage down it, and the sea is the return path.", src: ["layers", "power", "copperPower"] },
      jelly: { name: "Petroleum jelly", what: "A soft filling round the fibres.", does: "It fills the gaps round the fibres and keeps water away from them.", src: "layers" },
      fibre: { name: "Glass fibres", what: "Strands of very pure glass, as thin as a hair.", does: "They carry the message as light.", how: "Light bounces along inside each fibre and stays in it.", fact: "125 µm across, 250 µm with the coat. Drawn thicker here.", src: ["glass", "hair", "core"] },
      coin: { name: "Coin, 24 mm", what: "A US quarter, for scale.", does: "It shows how thin the cable is.", fact: "A quarter is 24.26 mm across. The cable is about 25 mm.", src: ["coin", "diameter"] },
      desk: { name: "Desk", what: "A table top, for scale." },
    });
    F.label("ny", { set: "globe", text: "New York", pin: true, on: nyHead, offset: [0, 0, 6] });
    F.label("london", { set: "globe", text: "London", pin: true, on: lonHead, offset: [0, 0, 6] });
    F.label("route", { set: "globe" }); F.label("pulse", { set: "globe", on: pulse[0] }); F.label("ocean", { set: "globe" });
    F.label("seabed", { set: "sea" }); F.label("cable2", { set: "sea" }); F.label("repeater", { set: "sea" }); F.label("pulse", { set: "sea", on: seaPulse[0] });
    for (const k of ["jacket", "mylar", "wires", "water", "poly", "copper", "jelly", "fibre"]) F.label(k, { set: "cut" });
    F.label("coin", { set: "cut", pin: true, box: true, on: coin, offset: [0, -17, -9] });

    // ---------- 4. running ----------
    const seaLen = 280, gapX = RX + RL / 2;
    const fmt = (n) => n.toLocaleString("en-US");
    // the first frame shows the first stage at once: the other two scenes must not fade out in a preview
    F.snap = true; let first = true;
    F.onFrame((dt) => {
      if (first) { first = false; F.snap = false; }
      if (!F.reduced) state.u = (state.u + dt / M.cross) % 1;
      const u = state.u;
      // globe: the pulse moves along the great circle, its tail behind it
      pulse.forEach((m, k) => { const t = Math.max(0, u - k * 0.012); m.position.copy(gc(t, R + 2.4)); m.visible = m.userData.alpha > 0.004 && u > k * 0.012; });
      trail.geometry.setDrawRange(0, Math.floor(u * trailSegs) * 72);
      // sea floor: the pulse fades as it travels, and the repeater restores it
      const x = -140 + u * seaLen, before = x < gapX, fadeK = before ? 1 - 0.75 * ((x + 140) / (gapX + 140)) : 1 - 0.75 * ((x - gapX) / (140 - gapX));
      const inRep = x > RX - 2 && x < RX + RL + 2;
      const head = seaPulse[0], p = seaPath(x), hid = x > RX + 1 && x < RX + RL - 1; head.position.set(p[0], p[1], p[2]);
      for (const m of [head, sleeve]) { m.material.emissive.setHex(GLOW).multiplyScalar(0.08 + 0.3 * fadeK); m.material.color.setHex(AMBER).multiplyScalar(0.3 + 0.7 * fadeK); }
      if (state.stage === 1) F.ghost(head, hid ? 0 : 1);
      const s0 = Math.max(0, Math.floor(((x - 44 + 140) / seaLen) * sleeveSegs)), s1 = Math.floor(((x + 140) / seaLen) * sleeveSegs); sleeve.geometry.setDrawRange(s0 * 72, Math.max(0, s1 - s0) * 72);
      F.glow(repBody, inRep ? 0.35 : 0, AMBER);
      // cut open: one pulse runs along a fibre to its tip, which flashes
      const f = fibres[0], fu = (u * 2) % 1; fibrePulse.position.copy(f.curve.getPointAt(Math.min(1, fu)));
      fibres.forEach((q, i) => q.tip.material.emissive.setHex(GLOW).multiplyScalar(i === 0 ? (fu > 0.92 ? 1 : 0.25) : 0.25));
      const s = state.stage;
      if (s === 0) F.readout(fmt(Math.round(u * M.km)) + " of " + fmt(M.km) + " km · " + (u * M.oneWayMs).toFixed(1) + " of " + M.oneWayMs.toFixed(0) + " ms · shown " + M.slow + "× slower");
      else if (s === 1) F.readout(inRep ? "inside the repeater: light boosted" : "light strength " + Math.round(fadeK * 100) + "% (illustrative) · one repeater every " + M.gap + " km or so");
      else F.readout("cable " + M.cableMm + " mm across · coin " + M.coinMm.toFixed(1) + " mm · glass fibre " + M.glassUm / 1000 + " mm");
    });

    // ---------- 5. stages ----------
    const box = (a, b) => new THREE.Box3(new V(...a), new V(...b));
    const show = (on) => { for (const t of ["globe", "sea", "cut"]) F.ghost(t, t === on ? 1 : 0); F.ghost("water", on === "sea" ? 0.2 : 0); for (const m of pulse.concat(trail)) F.ghost(m, on === "globe" ? 1 : 0); for (const m of seaPulse.concat(sleeve)) F.ghost(m, on === "sea" ? 1 : 0); F.ghost(fibrePulse, on === "cut" ? 1 : 0); };
    const STAGES = [
      { name: "Across the ocean", set: "globe", hint: "A cable on the sea floor joins New York and London. The message crosses it as a pulse of light.", go() { show("globe"); F.focus(box([-78, -78, GZ - 70], [78, 78, GZ + 80]), { azimuth: 20, elevation: 26, pad: 0.9 }); } },
      { name: "On the sea floor", set: "sea", hint: "Light fades as it travels through glass. A repeater on the sea floor boosts it again.", go() { show("sea"); F.focus(box([-130, -40, 0], [130, 40, 30]), { azimuth: 22, elevation: 26, pad: 0.92 }); } },
      { name: "Inside the cable", set: "cut", hint: "Cut open: plastic, steel and copper wrap a few hair-thin glass fibres. The whole cable is about as wide as a coin.", go() { show("cut"); F.focus(box([-70, -46, 0], [66, 14, 34]), { azimuth: 52, elevation: 20, pad: 0.98 }); } },
    ];

    // ---------- 6. controls ----------
    const bar = document.createElement("div"); bar.className = "mech-controls";
    bar.innerHTML = STAGES.map((s, i) => `<button data-stage="${i}">${i + 1} ${s.name}</button>`).join("") +
      `<span class="sp"></span><button data-t="labels" aria-pressed="${state.labels}">Labels</button><button data-t="style">${REAL ? "Line view" : "Real view"}</button>`;
    F.mount.querySelector(".mech-stage").after(bar);
    const hintEl = F.mount.querySelector(".mech-hint");
    function setStage(i, quiet) { if (!quiet) F.touch(); state.stage = ((i % STAGES.length) + STAGES.length) % STAGES.length; const S = STAGES[state.stage]; S.go(); F.select(null); F.labels(state.labels ? S.set : null); hintEl.textContent = S.hint; bar.querySelectorAll("[data-stage]").forEach((b, k) => b.setAttribute("aria-pressed", k === state.stage)); }
    bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F.touch(); const t = b.dataset.t;
      if (b.dataset.stage) setStage(+b.dataset.stage); else if (t === "style") { state.style = REAL ? "line" : "real"; start(); } else if (t === "labels") { state.labels = !state.labels; b.setAttribute("aria-pressed", state.labels); setStage(state.stage, true); } });
    F.stage.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= String(STAGES.length)) setStage(+e.key - 1); });
    F.onPress = () => setStage(state.stage + 1);
    F.tour(() => setStage(state.stage + 1, true), { idle: 6, every: 6 });

    // ---------- 7. card ----------
    mech.card("#fig", {
      fig: "Fig 8", title: "How a message crosses the ocean",
      keys: [{ mark: "lit", label: "Click a part to learn what it does" }, { mark: "mid", label: "Orange: a pulse of light carrying the message" }],
      caption: "A message crosses the Atlantic as pulses of light in glass fibres inside a cable on the sea floor. At about 200,000 km per second, light needs about 28 ms for the 5,600 km from New York to London. Here it is slowed about " + M.slow + " times. The route is drawn as a great circle, but real cables come ashore on the coast and take a longer path. The coastlines are a coarse sketch. On the sea floor the cable and repeater are not to scale, and how fast the light fades is made up. In the cut-open cable the layers follow a published cross-section of a cable's shore end, which has more armour than the deep sea part. The outside size and the coin are true to scale, the thickness of each inner layer is drawn to look right, and the fibres are drawn thicker than real. Open Sources for where each claim comes from.",
    });
    window.fig = F; window.setStage = setStage; window.state = state;
    setStage(state.stage, true); F.fit(true);
  }
  addEventListener("mech-theme", start);
  start();
})();
