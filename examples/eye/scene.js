/* How the human eye focuses. Units: millimetres. x runs along the optical axis, from the front of the cornea (x = 0) back to the retina.
   y is left, z is up. The eye looks toward -x, at a flower.
   Sourced: the Le Grand schematic eye (surface radii, gaps and refractive indices) from a university optics course, eye size, cornea size,
   pupil size, cornea and lens power, the near point of a young adult, and how the ciliary muscle, the fibres and the lens work together.
   Model: every ray, the place where the rays meet, the blur spot and the lens shape needed for each distance (paraxial ray trace).
   Illustrative: the way the bulged lens changes shape, the flower and its drawn distance, the slowed focusing, wall thickness. */
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  // ---------- 1. the model: every number on screen comes from here ----------
  const M = {
    nAir: 1, nCornea: 1.3771, nAqueous: 1.3374, nLens: 1.42, nVitreous: 1.336,   // Le Grand schematic eye
    corneaR1: 7.8, corneaR2: 6.5, corneaT: 0.55, aqueousT: 3.05, lensR1: 10.2, lensR2: -6.0, lensT: 4.0, vitreousT: 16.6,
    limbus: 5.75,          // cornea 11.5 mm across
    pupil: 2.0,            // pupil radius: 4 mm across, a typical size
    h: 1.8,                // rays enter this far from the axis, inside the pupil
    near: 100,             // near point of a young adult, mm
    dMin: 60, dMax: 20000, // slider range, mm
    tau: 0.45,             // how fast the lens refocuses in the figure, s (slowed)
    wall: 1.0, sclera: 0.7, Z0: 14,
  };
  // The lens bulges with one number s: 0 is relaxed (Le Grand), larger is rounder. The way it changes shape is illustrative.
  M.lens = (s) => ({ x: M.corneaT + M.aqueousT - 0.3 * s, R1: M.lensR1 - 4.4 * s, R2: -(-M.lensR2 - 0.9 * s), t: M.lensT + 0.8 * s });
  M.surfaces = (s) => { const L = M.lens(s); return [
    { x: 0, R: M.corneaR1, n0: M.nAir, n1: M.nCornea }, { x: M.corneaT, R: M.corneaR2, n0: M.nCornea, n1: M.nAqueous },
    { x: L.x, R: L.R1, n0: M.nAqueous, n1: M.nLens }, { x: L.x + L.t, R: L.R2, n0: M.nLens, n1: M.nVitreous }]; };
  // paraxial ray trace. Object on the axis at distance d in front of the cornea. The ray reaches the cornea at height h.
  M.trace = (s, d, h) => {
    const S = M.surfaces(s); let y = h, u = isFinite(d) ? h / d : 0; const pts = [];
    for (let i = 0; i < S.length; i++) { const k = S[i]; if (i) y += u * (k.x - S[i - 1].x); pts.push([k.x, y]); u = (k.n0 * u - y * (k.n1 - k.n0) / k.R) / k.n1; }
    const x = S[S.length - 1].x; return { pts, y, u, x, focus: x - y / u };
  };
  M.power = (s) => -M.nVitreous * M.trace(s, Infinity, 1).u * 1000;               // dioptres
  M.L = M.trace(0, Infinity, 1).focus;                                              // the relaxed eye focuses far away on the retina
  M.solve = (d) => { let a = 0, b = 3; for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (M.trace(m, d, 1).focus > M.L) a = m; else b = m; } return (a + b) / 2; };
  M.sMax = M.solve(M.near);                                                          // as round as the lens gets
  M.want = (d) => Math.min(M.solve(d), M.sMax);
  M.sag = (R, a) => Math.abs(R) - Math.sqrt(Math.max(0, R * R - a * a));
  M.equator = (s) => { const L = M.lens(s); let a = 0, b = Math.min(L.R1, -L.R2) - 1e-6; for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (M.sag(L.R1, m) + M.sag(L.R2, m) > L.t) b = m; else a = m; } return a; };
  // eye wall: a sphere through the edge of the cornea, with the retina surface at the back exactly where the relaxed eye focuses
  M.back = M.L + M.wall;
  { const xl = M.sag(M.corneaR1, M.limbus); M.Rs = ((M.back - xl) ** 2 + M.limbus ** 2) / (2 * (M.back - xl)); }
  M.c = M.back - M.Rs;                                                                // centre of the eyeball
  M.wallR = (x, R) => Math.sqrt(Math.max(0, R * R - (x - M.c) ** 2));                // radius of a wall sphere at x
  M.cilApex = (s) => lerp(6.35, 5.2, s / M.sMax);                                    // inner edge of the ciliary ring
  M.zonRest = 6.35 - M.equator(0);                                                    // fibre length, taut when relaxed
  // where the flower is drawn. The real distance runs from 6 cm to 20 m. The drawn one is squeezed.
  M.draw = (d) => -(24 + 36 * Math.log(d / M.dMin) / Math.log(M.dMax / M.dMin));
  const state = { stage: 0, labels: true, style: location.hash === "#line" ? "line" : "real", d: 1000, s: M.want(1000), hold: false, sweep: true, clock: 0 };
  // the self-running demo in stage 3: [time s, distance mm]. It goes far, near, too near, far.
  const SWEEP = [[0, 20000], [2, 20000], [3, 250], [6.5, 250], [7.5, 70], [10.5, 70], [11.5, 20000], [12.5, 20000]];
  const sweepAt = (t) => { t %= SWEEP[SWEEP.length - 1][0]; for (let i = 1; i < SWEEP.length; i++) if (t <= SWEEP[i][0]) { const [t0, d0] = SWEEP[i - 1], [t1, d1] = SWEEP[i]; const k = (t - t0) / (t1 - t0), e = k * k * (3 - 2 * k); return Math.exp(lerp(Math.log(d0), Math.log(d1), e)); } return SWEEP[0][1]; };
  let F = null;

  function start() {
    if (F) F.dispose();
    F = new mech.Figure("#fig", { theme: document.documentElement.dataset.theme || "dark", style: state.style, width: 760, height: 480, azimuth: -48, elevation: 16 });
    const REAL = state.style === "real", DARK = F.theme === "dark", T3 = THREE, LIGHT = 0xffc83a, f1 = (v) => v.toFixed(1), f2 = (v) => v.toFixed(2);
    const fmtD = (d) => (d >= 10000 ? "far away (" + Math.round(d / 1000) + " m)" : d >= 1000 ? f1(d / 1000) + " m away" : Math.round(d / 10) + " cm away");

    // ---------- facts ----------
    const GR = "https://wp.optics.arizona.edu/jgreivenkamp/wp-content/uploads/sites/11/2019/08/502-22-The-Eye.pdf", GRN = "J. Greivenkamp, OPTI-502 notes, The Eye (University of Arizona)";
    const HE = "https://en.wikipedia.org/wiki/Human_eye", AC = "https://en.wikipedia.org/wiki/Accommodation_(eye)", CO = "https://en.wikipedia.org/wiki/Cornea", LE = "https://en.wikipedia.org/wiki/Lens_(vertebrate_anatomy)";
    F.facts([
      { id: "legrand", claim: "Le Grand schematic eye: cornea radii 7.8 and 6.5 mm, 0.55 mm thick; 3.05 mm of aqueous; lens radii 10.2 and -6.0 mm, 4.0 mm thick; 16.6 mm of vitreous. Indices 1.3771, 1.3374, 1.420 and 1.336. Total power 59.9 D.", status: "sourced", source: GRN, url: GR },
      { id: "power", claim: "The eye has about 60 D of power. The cornea gives about 43 D. The relaxed lens gives about 19 D. The front surface of the cornea alone gives about 49 D, because of the large change of index there.", status: "sourced", source: GRN, url: GR },
      { id: "accom", claim: "To see near things, the ciliary muscle contracts and releases the tension on the zonule fibres. The lens bulges, its surfaces get steeper and the eye's power goes up. Relaxed, the muscle lets the fibres pull the lens flat.", status: "sourced", source: GRN, url: GR },
      { id: "pupil", claim: "The pupil is typically about 4 mm across, with a range of 2 to 8 mm.", status: "sourced", source: GRN, url: GR },
      { id: "size", claim: "A typical adult eye is 24 mm from front to back.", status: "sourced", source: "Wikipedia, Human eye", url: HE },
      { id: "corneaSize", claim: "The cornea is about 11.5 mm across and 0.5 mm thick at its centre. It accounts for most of the optical power of the eye.", status: "sourced", source: "Wikipedia, Human eye", url: HE },
      { id: "near", claim: "The nearest distance a young person can focus on is typically about 10 cm.", status: "sourced", source: "Wikipedia, Accommodation (eye)", url: AC },
      { id: "presby", claim: "Presbyopia, the loss of focusing range with age, begins after about age 40 and is helped by reading glasses.", status: "sourced", source: GRN, url: GR },
      { id: "lensGrad", claim: "The lens is clear and has no blood vessels. It is about 10 mm across and 4 mm thick, and thousands of fibres hold it at its edge.", status: "sourced", source: "Wikipedia, Lens (vertebrate anatomy)", url: LE },
      { id: "retina", claim: "Light-sensitive cells in the retina turn light into signals, and the optic nerve carries them to the brain. The iris sets how much light gets in, with muscles that widen and narrow the pupil.", status: "sourced", source: "Wikipedia, Human eye", url: HE },
      { id: "fovea", claim: "The fovea, in the centre of the macula, has the most cones and gives the sharpest sight. The line of sight through the macula is about 5 degrees to the side of the optical axis.", status: "sourced", source: GRN, url: GR },
      { id: "trace", claim: "Every ray, the point where the rays meet and the blur spot come from a paraxial ray trace through the four surfaces of the schematic eye.", status: "model" },
      { id: "retinaPos", claim: "The retina sits " + f2(M.L) + " mm behind the front of the cornea, where the relaxed eye brings far light together.", status: "model" },
      { id: "shape", claim: "How the lens changes shape as it bulges. The shape is drawn to give the power the model needs, not measured. The 10 cm limit is sourced.", status: "illustrative" },
      { id: "scene", claim: "The flower, its drawn distance (squeezed so it fits), the slowed focusing, the wall thickness, the ciliary body and fibre layout, and the fovea drawn on the optical axis.", status: "illustrative" },
    ]);

    // ---------- checks ----------
    F.check("the schematic eye has 59.9 D of power", Math.abs(M.power(0) - 59.9) < 0.1, f2(M.power(0)) + " D");
    F.check("the relaxed eye brings far light together on the retina, 24.2 mm back", Math.abs(M.L - (0.55 + 3.05 + 4.0 + 16.6)) < 0.01, f2(M.L) + " mm");
    F.check("the eye length is inside the typical range 22 to 24.8 mm", M.L > 22 && M.L < 24.8);
    { let worst = 0; for (let d = M.near; d <= M.dMax; d *= 1.15) worst = Math.max(worst, Math.abs(M.trace(M.want(d), d, M.h).focus - M.L));
      F.check("from 10 cm to 20 m, the lens can always put the meeting point on the retina", worst < 0.005, "worst miss " + worst.toFixed(4) + " mm"); }
    F.check("closer than 10 cm the rays meet behind the retina", M.trace(M.want(70), 70, M.h).focus > M.L + 0.1);
    F.check("a relaxed lens and a flower at 25 cm: the rays meet behind the retina", M.trace(0, 250, M.h).focus > M.L + 0.5);
    F.check("a lens set for 25 cm and a far flower: the rays meet in front of the retina", M.trace(M.want(250), 20000, M.h).focus < M.L - 0.5);
    { const add = M.power(M.sMax) - M.power(0); F.check("the lens adds about 10 D to reach 10 cm", add > 9.5 && add < 12, f2(add) + " D"); }
    { let up = true, prevE = 99, prevT = 0; for (let s = 0; s <= M.sMax + 1e-9; s += M.sMax / 20) { const e = M.equator(s), t = M.lens(s).t; if (!(e < prevE + 1e-9 && t > prevT - 1e-9)) up = false; prevE = e; prevT = t; }
      F.check("as the lens bulges it gets thicker and narrower", up, "equator " + f2(2 * M.equator(0)) + " to " + f2(2 * M.equator(M.sMax)) + " mm"); }
    F.check("the relaxed lens is about 10 mm across and 4 mm thick", Math.abs(2 * M.equator(0) - 10) < 0.3 && M.lens(0).t === 4);
    F.check("the fibres go slack when the muscle contracts", M.cilApex(M.sMax) - M.equator(M.sMax) < M.zonRest && M.cilApex(0) - M.equator(0) === M.zonRest);
    F.check("the rays pass inside the pupil", M.h < M.pupil);
    { const L = M.lens(M.sMax); F.check("the bulged lens stays clear of the cornea and the iris", L.x - (M.corneaT) > 2 && L.x + M.sag(L.R1, M.pupil) > 3.45); }
    F.check("the eye wall passes through the edge of the cornea", Math.abs(M.wallR(M.sag(M.corneaR1, M.limbus), M.Rs) - M.limbus) < 1e-6, "eyeball radius " + f2(M.Rs) + " mm");

    // ---------- parts ----------
    const eye = F.group({ at: [0, 0, M.Z0] });
    // revolve a closed profile [[r, x], ...] round the x axis. half: "far" (y > 0) or "near" (y < 0). Flat caps close the cut.
    function revolve(profile, half, opts, n = 48) {
      const phi0 = half === "far" ? Math.PI : 0, out = [];
      const g = new T3.LatheGeometry(profile.concat([profile[0]]).map((p) => new T3.Vector2(Math.max(p[0], 1e-4), p[1])), n, phi0, Math.PI); g.rotateZ(-Math.PI / 2); g.computeVertexNormals();
      out.push(F.add(g, Object.assign({ group: eye, side: "double", edges: false }, opts)));
      const sh = new T3.Shape(profile.map((p) => new T3.Vector2(p[1], p[0])));
      for (const sgn of [1, -1]) { const c = new T3.ShapeGeometry(sh); c.rotateX(sgn * Math.PI / 2); out.push(F.add(c, Object.assign({ group: eye, side: "double", edges: false, shadow: false }, opts))); }
      return out;
    }
    const arc = (R, cx, a0, a1, n, rad) => { const p = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); p.push([rad * Math.sin(a), cx - rad * Math.cos(a)]); } return p; };
    // eye wall (sclera): from the edge of the cornea round to the back
    const th0 = Math.asin(M.limbus / M.Rs), thIn = Math.asin(clamp(M.limbus / (M.Rs - M.sclera), 0, 1));
    const wallProf = arc(0, M.c, th0, Math.PI, 40, M.Rs).concat(arc(0, M.c, Math.PI, th0 + 0.02, 40, M.Rs - M.sclera));
    const ora = 8.2;
    // retina and choroid: the inner lining from the ora serrata to the back. Its inner face is the retina surface.
    const retProf = arc(0, M.c, Math.acos((M.c - ora) / (M.Rs - M.sclera)), Math.PI, 36, M.Rs - M.sclera).concat(arc(0, M.c, Math.PI, Math.acos((M.c - ora) / (M.Rs - M.wall)), 36, M.Rs - M.wall));
    const SCLERA = DARK ? 0xe9e4da : 0xf3efe6, RETINA = 0xd9786a, IRIS = 0x5b7f5e, IRIS2 = 0x8aa66c;
    const wallF = revolve(wallProf, "far", { color: SCLERA, mat: "rubber", tag: "wall", info: "sclera" }, 64), wallN = revolve(wallProf, "near", { color: SCLERA, mat: "rubber", tag: "wallN", info: "sclera" }, 64);
    const retF = revolve(retProf, "far", { color: RETINA, mat: "rubber", tag: "retina", info: "retina" }, 64), retN = revolve(retProf, "near", { color: RETINA, mat: "rubber", tag: "retinaN", info: "retina" }, 64);
    for (const m of retF.concat(retN)) m.material.emissive.setHex(0x4a1d16);
    // cornea: the clear dome in front
    const corProf = []; for (let i = 0; i <= 24; i++) { const r = M.limbus * i / 24; corProf.push([r, M.sag(M.corneaR1, r)]); }
    const rIn = (M.Rs - M.sclera) * Math.sin(th0 + 0.02), xIn = M.c - (M.Rs - M.sclera) * Math.cos(th0 + 0.02);
    corProf.push([rIn, xIn]); for (let i = 24; i >= 0; i--) { const r = Math.min(rIn - 0.15, 6.2) * i / 24; corProf.push([r, M.corneaT + M.sag(M.corneaR2, r)]); }
    const cornea = revolve(corProf, "far", { mat: "glass", color: 0xdfeaf2, tag: "cornea", info: "cornea", shadow: false }, 64).concat(revolve(corProf, "near", { mat: "glass", color: 0xdfeaf2, tag: "corneaN", info: "cornea", shadow: false }, 64));
    // iris: a ring in front of the lens, with the pupil in its middle
    const IX = 3.05, irisProf = [[M.pupil, IX + 0.1], [M.pupil + 0.3, IX - 0.05], [3.2, IX - 0.12], [5.0, IX - 0.02], [M.wallR(IX + 0.5, M.Rs - M.sclera), IX + 0.05], [M.wallR(IX + 0.5, M.Rs - M.sclera), IX + 0.5], [M.pupil + 0.3, IX + 0.45], [M.pupil, IX + 0.35]];
    revolve(irisProf, "far", { color: IRIS, mat: "rubber", tag: "iris", info: "iris", shadow: false }, 64); revolve(irisProf, "near", { color: IRIS, mat: "rubber", tag: "irisN", info: "iris", shadow: false }, 64);
    // iris texture: a pale ring (the collarette) and fine radial fibres on its front face
    for (const half of ["far", "near"]) { const tg = half === "far" ? "iris" : "irisN", p0 = half === "far" ? Math.PI : 0;
      revolve([[2.9, IX - 0.06], [3.2, IX - 0.06], [3.2, IX - 0.2], [2.9, IX - 0.2]], half, { color: IRIS2, mat: "rubber", tag: tg, info: "iris", shadow: false }, 64);
      for (let k = 0; k < 24; k++) { const a = p0 + (k + 0.5) / 24 * Math.PI; F.link([IX - 0.13, -(M.pupil + 0.35) * Math.sin(a), (M.pupil + 0.35) * Math.cos(a)], [IX - 0.08, -5.4 * Math.sin(a), 5.4 * Math.cos(a)], { w: 0.12, d: 0.12, r: 0.04 }, { group: eye, color: k % 2 ? IRIS2 : 0x46684a, mat: "rubber", tag: tg, info: "iris", edges: false, shadow: false }); } }
    // ciliary body: a ring of muscle round the lens. It is rebuilt when it tightens.
    const cilProf = (s) => { const ap = M.cilApex(s), p = [[ap + 0.4, IX + 0.9], [ap, 4.9], [ap + 0.5, 5.8], [M.wallR(ora, M.Rs - M.sclera) - 0.6, ora - 0.2]]; for (let i = 0; i <= 8; i++) { const x = lerp(ora, IX + 0.5, i / 8); p.push([M.wallR(x, M.Rs - M.sclera) + 0.05, x]); } return p; };
    const cil = { far: revolve(cilProf(0), "far", { color: 0x8a4a3e, mat: "rubber", tag: "cil", info: "ciliary", shadow: false }, 64), near: revolve(cilProf(0), "near", { color: 0x8a4a3e, mat: "rubber", tag: "cilN", info: "ciliary", shadow: false }, 64) };
    // lens: rebuilt from the model each time its shape changes
    const lensProfile = (s) => { const L = M.lens(s), a = M.equator(s), p = []; for (let i = 0; i <= 24; i++) { const r = a * i / 24; p.push([r, L.x + M.sag(L.R1, r)]); } for (let i = 24; i >= 0; i--) { const r = a * i / 24; p.push([r, L.x + L.t - M.sag(L.R2, r)]); } return p; };
    const lensGeo = (s) => { const g = new T3.LatheGeometry(lensProfile(s).map((p) => new T3.Vector2(Math.max(p[0], 1e-4), p[1])), 64); g.rotateZ(-Math.PI / 2); g.computeVertexNormals(); return g; };
    const lens = F.add(lensGeo(0), { group: eye, color: 0xf6ecc8, tag: "lens", info: "lens", edges: false, shadow: false });
    // zonule fibres: from the lens equator out to the ciliary ring. Each fibre has a fixed length, so it sags when the ends come closer.
    const ZN = 28, zon = []; for (let k = 0; k < ZN; k++) { const a = (k + 0.5) / ZN * Math.PI * 2, far = Math.sin(a) < 0, tg = far ? "zon" : "zonN";
      zon.push({ a, m: [F.link([0, 0, 0], [1, 0, 0], { w: 0.07, d: 0.07, r: 0.03 }, { group: eye, color: 0xe7e0cc, tag: tg, info: "zonule", edges: false, shadow: false }), F.link([0, 0, 0], [1, 0, 0], { w: 0.07, d: 0.07, r: 0.03 }, { group: eye, color: 0xe7e0cc, tag: tg, info: "zonule", edges: false, shadow: false })] }); }
    // fovea at the back on the axis, optic nerve leaving a little to the side
    F.cyl({ r: 1.0, h: 0.12, n: 32, axis: "x" }, { group: eye, at: [M.L - 0.1, 0, 0], color: 0x8e3a2c, mat: "rubber", tag: "fovea", info: "fovea", edges: false, shadow: false });
    const nA = 16 * Math.PI / 180, nDir = [Math.cos(nA), Math.sin(nA)], onWall = (R) => [M.c + R * nDir[0], R * nDir[1], 0];
    F.cyl({ r: 0.85, h: 0.4, n: 28, axis: "x" }, { group: eye, at: onWall(M.Rs - M.wall - 0.15), rot: [0, 0, nA], color: 0xf0d9b0, mat: "rubber", tag: "nerve", info: "nerve", edges: false, shadow: false });
    { const p0 = onWall(M.Rs - M.wall + 0.2), p = [p0]; for (let i = 1; i <= 4; i++) { const t = i * 1.9; p.push([p0[0] + t * nDir[0], p0[1] + t * nDir[1] + 0.05 * t * t, -0.02 * t * t]); }
      F.tube(p, 1.6, { group: eye, color: 0xead6bd, mat: "rubber", tag: "nerve", info: "nerve" }); }
    // the flower: what the eye looks at
    const flower = F.group({ info: "flower" }), FX = (d) => M.draw(d);
    F.tube([[0, 0, 6.4], [0.3, 0, 8.5], [0, 0.2, 11], [0, 0, M.Z0 - 0.4]], 0.32, { group: flower, color: 0x4f8a3c, mat: "rubber", tag: "obj", info: "flower" });
    F.add(new T3.SphereGeometry(1.7, 10, 6), { group: flower, at: [0.3, 0.9, 9.0], rot: [0.5, 0.2, 0.9], color: 0x5e9a46, mat: "rubber", tag: "obj", info: "flower", edges: false }).scale.set(1, 0.35, 0.6);
    F.lathe([[0, 0], [2.4, 0], [3.0, 3.2], [3.2, 3.6], [0, 3.6]], { n: 28 }, { group: flower, color: 0xb46a45, mat: "rubber", tag: "obj", info: "flower", at: [0, 0, 3.2] });
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, pm = F.add(new T3.SphereGeometry(1, 14, 8), { group: flower, at: [0.15, 1.9 * Math.cos(a), M.Z0 + 1.9 * Math.sin(a)], rot: [a - Math.PI / 2, 0, 0], color: 0xfbfaf4, mat: "rubber", tag: "obj", info: "flower", edges: false }); pm.scale.set(0.35, 0.9, 1.45); }
    F.add(new T3.SphereGeometry(1.0, 18, 12), { group: flower, at: [0, 0, M.Z0], color: 0xf2b21b, mat: "rubber", tag: "obj", info: "flower", edges: false }).scale.set(0.7, 1, 1);
    // a little table under the flower pot, so it stands on something
    const table = F.box({ w: 11, d: 11, h: 3.2, r: 1.2 }, { mat: "castAl", tag: "obj", info: "flower", group: flower, at: [0, 0, 0] }); void table;
    // light: a see-through cone from the flower into the eye, and 8 rays on its surface
    const beamMat = (o) => Object.assign({ group: eye, color: LIGHT, edges: false, shadow: false, side: "double" }, o);
    const beamOut = F.add(new T3.BufferGeometry(), beamMat({ tag: "beam", info: "light" })), beamIn = F.add(new T3.BufferGeometry(), beamMat({ tag: "beamIn", info: "light" })), beamBy = F.add(new T3.BufferGeometry(), beamMat({ tag: "beyond", info: "light" }));
    for (const m of [beamOut, beamIn, beamBy]) { m.material.emissive.setHex(LIGHT); m.material.emissiveIntensity = 0.55; }
    const RN = 8, rays = []; for (let k = 0; k < RN; k++) { const a = k / RN * Math.PI * 2, segs = [];
      for (let j = 0; j < 6; j++) { const m = F.link([0, 0, 0], [1, 0, 0], { w: 0.09, d: 0.09, r: 0.04 }, { group: eye, color: LIGHT, tag: j === 0 ? "rayExt" : j === 5 ? "beyond" : "ray", info: "light", edges: false, shadow: false }); m.material.emissive.setHex(LIGHT); m.material.emissiveIntensity = 0.8; segs.push(m); }
      rays.push({ a, segs }); }
    const dot = F.add(new T3.SphereGeometry(0.32, 16, 10), { group: eye, color: 0xfff1b0, tag: "dot", info: "light", edges: false, shadow: false }); dot.material.emissive.setHex(LIGHT);
    const spot = F.cyl({ r: 1, h: 0.08, n: 32, axis: "x" }, { group: eye, color: 0xffe27a, tag: "spot", info: "spot", edges: false, shadow: false }); spot.material.emissive.setHex(LIGHT); spot.material.emissiveIntensity = 0.9;

    // ---------- what each part is ----------
    F.describe({
      cornea: { name: "Cornea", what: "The clear dome at the front of the eye.", does: "It does most of the bending of light.", how: "The change from air to cornea is the biggest step light meets in the eye, and the curved surface bends it inward.", fact: "About 43 of the eye's 60 dioptres. A dioptre measures how strongly something bends light.", src: ["power", "corneaSize"] },
      iris: { name: "Iris", what: "The coloured ring behind the cornea.", does: "It sets how much light gets in.", how: "Muscles in it make the hole in its middle, the pupil, wider or narrower.", fact: "The pupil is typically about 4 mm across, and can range from 2 to 8 mm.", src: ["pupil", "retina"] },
      lens: { name: "Lens", what: "A clear, flexible disc behind the iris.", does: "It fine-tunes the focus for near and far things.", how: "When it bulges, its surfaces curve more and it bends light more strongly.", fact: "About 10 mm across and 4 mm thick. Relaxed, it gives about 19 dioptres.", src: ["power", "accom", "lensGrad", "legrand", "shape"] },
      ciliary: { name: "Ciliary muscle", what: "A ring of muscle around the lens.", does: "It tells the lens to bulge or flatten.", how: "When it contracts, the ring gets smaller, the fibres go slack and the lens springs rounder. When it relaxes, the fibres pull the lens flat.", src: ["accom", "scene"] },
      zonule: { name: "Zonule fibres", what: "Thousands of fine fibres that hold the lens in place.", does: "They pull on the edge of the lens.", how: "Tight fibres stretch the lens flat. Slack fibres let it round up.", src: ["accom", "lensGrad", "scene"] },
      retina: { name: "Retina", what: "A thin layer lining the back of the eye.", does: "It turns light into signals for the brain.", how: "Light-sensitive cells respond when light lands on them. A sharp picture needs each point of light to land on one spot.", src: ["retina", "retinaPos"] },
      fovea: { name: "Fovea", what: "A small spot in the middle of the macula, at the back of the retina.", does: "It gives the sharpest sight.", how: "It has the most cone cells. Your eye turns so that what you look at lands here.", src: ["fovea", "scene"] },
      sclera: { name: "White of the eye", what: "The tough outer wall of the eyeball.", does: "It keeps the eye's round shape.", fact: "The eye is about 24 mm from front to back.", src: ["size", "scene"] },
      nerve: { name: "Optic nerve", what: "A cable of nerve fibres at the back of the eye.", does: "It carries the signals from the retina to the brain.", src: ["retina"] },
      flower: { name: "Flower", what: "What the eye is looking at.", does: "Every point on it sends light out in all directions. The figure follows the light from one point.", src: ["scene"] },
      light: { name: "Light rays", what: "Light from the centre of the flower that gets through the pupil.", does: "It spreads out on its way to the eye. The eye bends it back together.", how: "Where the rays meet is worked out from the shape and the material of each surface.", src: ["trace", "legrand"] },
      spot: { name: "Blur spot", what: "The patch of light where the rays hit the retina.", does: "Small means sharp. Large means blurry.", how: "If the rays have not met yet, or met already, they land as a disc, not a point.", src: ["trace"] },
    });
    for (const k of ["cornea", "iris", "sclera", "flower"]) F.label(k, { set: "whole" });
    for (const k of ["cornea", "iris", "lens", "retina", "nerve", "light"]) F.label(k, { set: "inside" });
    for (const k of ["lens", "ciliary", "zonule", "retina", "cornea"]) F.label(k, { set: "focus" });
    const LM = F.label("light", { set: "focus", text: "Rays meet here", on: dot });
    F.label("flower", { set: "inside" });

    // ---------- inset: what the retina gets. The blur grows with the blur spot from the model. ----------
    const inset = document.createElement("canvas"), IW = 150, IH = 150, dpr = Math.min(devicePixelRatio || 1, 2); inset.width = IW * dpr; inset.height = IH * dpr;
    inset.style.cssText = "position:absolute;left:8px;top:8px;width:" + IW + "px;height:" + IH + "px;border:1px solid var(--m-rule);border-radius:8px;background:var(--m-card);pointer-events:none;display:none"; F.stage.appendChild(inset);
    const g2 = inset.getContext("2d"), INK = DARK ? "#e8e8e8" : "#1a1a1a", MUTED = DARK ? "#8a8a8a" : "#6b6b70";
    function drawInset(blurMM, sharp) {
      g2.setTransform(dpr, 0, 0, dpr, 0, 0); g2.clearRect(0, 0, IW, IH); g2.font = "11px -apple-system,Segoe UI,sans-serif"; g2.textAlign = "center"; g2.textBaseline = "middle";
      g2.fillStyle = MUTED; g2.fillText("What the retina gets", IW / 2, 13);
      const px = sharp ? 0 : Math.min(14, 2 + blurMM * 22); g2.save(); g2.filter = px ? "blur(" + px.toFixed(1) + "px)" : "none";
      const cx = IW / 2, cy = 76; g2.fillStyle = "#4f8a3c"; g2.fillRect(cx - 1.5, cy, 3, 46);
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; g2.save(); g2.translate(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17); g2.rotate(a); g2.fillStyle = DARK ? "#f4f2ea" : "#ffffff"; g2.strokeStyle = "#c9c6bb"; g2.lineWidth = 1; g2.beginPath(); g2.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2); g2.fill(); g2.stroke(); g2.restore(); }
      g2.fillStyle = "#f2b21b"; g2.beginPath(); g2.arc(cx, cy, 8, 0, Math.PI * 2); g2.fill(); g2.restore();
      g2.fillStyle = sharp ? INK : "#c0503f"; g2.font = "600 12px -apple-system,Segoe UI,sans-serif"; g2.fillText(sharp ? "Sharp" : "Blurry", IW / 2, IH - 11);
    }

    // ---------- running ----------
    const P = (x, r, a) => [x, -r * Math.sin(a), r * Math.cos(a)];
    const cone = (prof) => { if (prof.length < 2) return new T3.BufferGeometry(); const g = new T3.LatheGeometry(prof.map((p) => new T3.Vector2(Math.max(Math.abs(p[0]), 1e-3), p[1])), 48); g.rotateZ(-Math.PI / 2); return g; };
    const setGeo = (m, g) => { m.geometry.dispose(); m.geometry = g; };
    let lastS = -1, lastCil = -1, lastKey = "", info = null;
    function pose() {
      const key = state.d.toFixed(2) + "|" + state.s.toFixed(5) + "|" + state.hold; if (key === lastKey) return; lastKey = key;
      const d = state.d, s = state.s, xo = FX(d), tr = M.trace(s, d, M.h), L = M.lens(s);
      flower.position.x = xo;
      // lens and ciliary ring shape
      if (Math.abs(s - lastS) > 1e-4) { setGeo(lens, lensGeo(s)); lastS = s; }
      if (Math.abs(s - lastCil) > 0.01) { lastCil = s; for (const half of ["far", "near"]) { const [shell, c1, c2] = cil[half], prof = cilProf(s), phi0 = half === "far" ? Math.PI : 0;
        const g = new T3.LatheGeometry(prof.concat([prof[0]]).map((p) => new T3.Vector2(p[0], p[1])), 64, phi0, Math.PI); g.rotateZ(-Math.PI / 2); g.computeVertexNormals(); setGeo(shell, g);
        const sh = new T3.Shape(prof.map((p) => new T3.Vector2(p[1], p[0]))); const ga = new T3.ShapeGeometry(sh); ga.rotateX(Math.PI / 2); setGeo(c1, ga); const gb = new T3.ShapeGeometry(sh); gb.rotateX(-Math.PI / 2); setGeo(c2, gb); } }
      // fibres: fixed length, so a fibre sags forward when its ends come closer
      const eq = M.equator(s), ex = L.x + M.sag(L.R1, eq), ap = M.cilApex(s), span = ap - eq, sagb = Math.sqrt(Math.max(0, (M.zonRest / 2) ** 2 - (span / 2) ** 2));
      for (const z of zon) { const a = P(ex, eq, z.a), b = P(4.9, ap, z.a), mid = P((ex + 4.9) / 2 - sagb, (eq + ap) / 2, z.a); z.m[0].setEnds(a, mid); z.m[1].setEnds(mid, b); }
      // rays: bend points on the real curved surfaces, heights from the trace
      const S = M.surfaces(s), xs = tr.pts.map(([x, y], i) => x + (i === 3 ? -M.sag(S[i].R, y) : M.sag(S[i].R, y))), ys = tr.pts.map((p) => p[1]);
      const yRet = tr.y + tr.u * (M.L - tr.x), xRet = M.L - M.sag(M.Rs - M.wall, yRet), behind = tr.focus > M.L, xF = Math.min(tr.focus, M.L + 14);
      for (const r of rays) {
        const pts = [[xo, 0], [xs[0], ys[0]], [xs[1], ys[1]], [xs[2], ys[2]], [xs[3], ys[3]], [xRet, yRet]];
        for (let j = 0; j < 5; j++) r.segs[j].setEnds(P(pts[j][0], pts[j][1], r.a), P(pts[j + 1][0], pts[j + 1][1], r.a));
        r.segs[5].setEnds(P(xRet, yRet, r.a), P(behind ? xF : xRet + 0.01, behind ? 0 : yRet, r.a));
      }
      setGeo(beamOut, cone([[0, xo], [ys[0], xs[0]]]));
      const inProf = [[ys[0], xs[0]], [ys[1], xs[1]], [ys[2], xs[2]], [ys[3], xs[3]]]; if (!behind) inProf.push([0, tr.focus]); inProf.push([yRet, xRet]);
      setGeo(beamIn, cone(inProf)); setGeo(beamBy, behind ? cone([[yRet, xRet], [0, xF]]) : cone([[0.05, xRet], [0, xRet + 0.05]]));
      dot.position.set(behind ? xF : tr.focus, 0, 0);
      const blur = Math.abs(yRet) * M.pupil / M.h; spot.position.x = xRet - 0.15; spot.scale.set(1, Math.max(blur, 0.12), Math.max(blur, 0.12));
      const miss = tr.focus - M.L, sharp = Math.abs(miss) < 0.05;
      LM.text(sharp ? "Rays meet on the retina" : behind ? "Rays would meet here" : "Rays meet too soon");
      const word = s < 0.03 ? "relaxed and flat" : s >= M.sMax - 1e-3 ? "as round as it gets" : "rounder (" + Math.round(s / M.sMax * 100) + "% of its range)";
      info = { d, s, miss, sharp, blur, word }; drawInset(2 * blur, sharp);
      F.readout("Flower " + fmtD(d) + " · lens " + word + (state.hold ? ", held" : "") + " · " + (sharp ? "rays meet on the retina: sharp" : "rays meet " + f1(Math.abs(miss)) + " mm " + (behind ? "behind" : "in front of") + " the retina: blur spot " + f2(2 * blur) + " mm"));
    }
    F.onFrame((dt) => {
      if (state.stage === 2 && state.sweep && !lessonOn) { state.clock += dt; state.d = sweepAt(state.clock); syncSlider(); }
      if (!state.hold) { const want = M.want(state.d); state.s = F.snap || F.reduced ? want : state.s + (want - state.s) * (1 - Math.exp(-dt / M.tau)); }
      pose();
    });

    // ---------- views ----------
    const box = (a, b) => new T3.Box3(new T3.Vector3(...a), new T3.Vector3(...b));
    const NEAR = ["wallN", "retinaN", "corneaN", "irisN", "cilN", "zonN"];
    function show(v) {
      const cut = v.cut ? 0 : 1; for (const t of NEAR) F.ghost(t, cut);
      if (v.cut) F.ghost("wallN", 0.05);
      F.ghost("cornea", 0.35); F.ghost("corneaN", v.cut ? 0 : 0.35); F.ghost("lens", 0.55);
      F.ghost("beam", 0.22); F.ghost("rayExt", 1); F.ghost("beamIn", v.cut ? 0.2 : 0); F.ghost("ray", v.cut ? 1 : 0);
      F.ghost("beyond", v.cut ? 0.45 : 0); F.ghost("dot", v.cut ? 1 : 0); F.ghost("spot", v.cut ? 1 : 0);
      F.labels(state.labels ? v.set : null); F.focus(v.box, { azimuth: v.az, elevation: v.el, pad: v.pad || 1.05 });
      sl.hidden = slLab.hidden = holdB.hidden = !v.slider; inset.style.display = v.inset ? "block" : "none"; lastKey = ""; F.run();
    }
    const STAGES = [
      { name: "The eye", set: "whole", hint: "An eye looking at a flower. Light from the flower goes in through the black hole in the middle, the pupil.", box: box([-44, -13, 0], [27, 13, 28]), az: -50, el: 16, d: 1000 },
      { name: "Inside", set: "inside", cut: true, hint: "Cut in half. Light from the flower bends at the cornea, bends again at the lens, and the rays meet in one point on the retina.", box: box([-44, -13, 0], [27, 13, 28]), az: -4, el: 12, d: 1000 },
      { name: "Near and far", set: "focus", cut: true, slider: true, hint: "Move the slider. When the flower comes close, the muscle ring tightens and the lens bulges, so the rays meet on the retina again. Closer than about 10 cm it cannot bulge enough, and the rays miss.", box: box([-7, -12, 1], [35, 12, 27]), az: -2, el: 10, inset: true },
    ];

    // ---------- controls and lesson ----------
    const bar = document.createElement("div"); bar.className = "mech-controls";
    bar.innerHTML = STAGES.map((s, i) => `<button data-stage="${i}">${i + 1} ${s.name}</button>`).join("") +
      `<span class="sp"></span><span data-c="d">Flower distance</span><input data-c="d" type="range" min="0" max="1000" step="1" aria-label="Distance of the flower, 6 cm to 20 m"><button data-t="hold" aria-pressed="false">Hold the lens</button>` +
      `<span class="sp"></span><button data-t="labels" aria-pressed="${state.labels}">Labels</button><button data-t="lesson">Lesson</button><button data-t="style">${REAL ? "Line view" : "Real view"}</button>`;
    F.mount.querySelector(".mech-stage").after(bar);
    const hintEl = F.mount.querySelector(".mech-hint"), sl = bar.querySelector("input"), slLab = bar.querySelector("span[data-c]"), holdB = bar.querySelector("[data-t=hold]");
    const toSl = (d) => Math.round(Math.log(d / M.dMin) / Math.log(M.dMax / M.dMin) * 1000), fromSl = (v) => M.dMin * Math.pow(M.dMax / M.dMin, v / 1000);
    function syncSlider() { sl.value = toSl(state.d); }
    sl.addEventListener("input", () => { F.touch(); state.sweep = false; state.d = fromSl(+sl.value); F.run(); });
    const setHold = (on) => { state.hold = on; holdB.setAttribute("aria-pressed", on); };
    function setStage(i, quiet) { if (!quiet) F.touch(); state.stage = ((i % STAGES.length) + STAGES.length) % STAGES.length; const S = STAGES[state.stage];
      if (S.d) { state.d = S.d; setHold(false); } if (state.stage === 2) { state.sweep = true; state.clock = 0; setHold(false); } show(S); hintEl.textContent = S.hint; syncSlider();
      bar.querySelectorAll("[data-stage]").forEach((b, k) => b.setAttribute("aria-pressed", k === state.stage)); }
    let lessonOn = false;
    const step = (d, s, hold, extra) => () => { lessonOn = true; state.stage = 2; show(Object.assign({}, STAGES[2], extra)); state.d = d; setHold(hold); state.s = s === null ? M.want(d) : s; syncSlider(); bar.querySelectorAll("[data-stage]").forEach((b) => b.setAttribute("aria-pressed", "false")); };
    const lesson = F.lesson([
      { title: "1. Far away: a relaxed lens", text: "Light from a far flower arrives with its rays almost side by side. The cornea and the flat, relaxed lens bend them just enough to meet on the retina.", go: step(20000, null, false) },
      { title: "2. Bring it close, keep the lens flat", text: "Now the flower is 25 cm away, so its rays spread out more. With the lens held flat, they cannot meet in time. They would meet behind the retina, and the retina gets a blur spot.", go: step(250, 0, true) },
      { title: "3. The lens bulges", text: "The ring of muscle tightens. The fibres go slack, and the lens springs rounder and thicker. A rounder lens bends light more, so the rays meet on the retina again.", go: step(250, null, false) },
      { title: "4. Too close", text: "At 7 cm the lens is as round as it gets, and the rays still meet behind the retina. A young adult can focus down to about 10 cm. After about 40 the lens loses its range, which is why people need reading glasses.", go: step(70, null, false) },
    ], { onClose: () => { lessonOn = false; setStage(0, true); } });
    bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F.touch(); const t = b.dataset.t;
      if (b.dataset.stage) setStage(+b.dataset.stage); else if (t === "style") { state.style = REAL ? "line" : "real"; start(); } else if (t === "hold") { setHold(!state.hold); state.sweep = false; } else if (t === "labels") { state.labels = !state.labels; b.setAttribute("aria-pressed", state.labels); F.labels(state.labels ? STAGES[state.stage].set : null); } else if (t === "lesson") lesson.open(0); });
    F.stage.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= String(STAGES.length)) setStage(+e.key - 1); });
    F.onPress = () => setStage(state.stage + 1);
    F.tour(() => setStage(state.stage + 1, true), { idle: 14, every: 13 });

    // ---------- card ----------
    mech.card("#fig", {
      fig: "Fig 10", title: "How the eye focuses near and far",
      keys: [{ mark: "lit", label: "Click a part or its label to learn what it does" }, { mark: "mid", label: "Keys 1 to 3 change the view. Drag to orbit. Sources lists every claim." }],
      caption: "The eye bends light twice, at the cornea and at the lens, so that the light from each point of what you look at meets in one point on the retina. For a near object the lens bulges and bends light more. The eye and every ray come from the Le Grand schematic eye, a standard textbook model with a " + f1(M.power(0)) + " dioptre eye, " + f1(M.L) + " mm long. The rays are traced with the simple (paraxial) method, which is exact near the axis. The figure follows light from one point of the flower only. Simplified: the flower and its distance are not to scale, and the distance is drawn squeezed so it fits, so the rays outside the eye look more spread out than they are. The way the lens changes shape is drawn, not measured. The fovea is drawn on the axis; in a real eye it sits about 5 degrees to the side. Focusing is slowed down to about half a second. The light shows the path of the rays, not their speed.",
    });
    window.fig = F; window.setStage = setStage; window.state = state; window.model = M;
    setStage(state.stage, true); F.fit(true);
  }
  addEventListener("mech-theme", start);
  start();
})();
