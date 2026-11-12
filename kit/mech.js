/* mech: isometric technical figures on a real 3D core.
   World: x right, y toward the viewer, z up. Units are millimetres of the real thing, or whatever you like.
   Uses the global THREE (r128). Everything else is here. */
(function (global) {
  const T = global.THREE;
  const THEMES = {
    dark: { paper: 0x121212, face: 0x1b1b1b, hi: 0x565656, mid: 0x3c3c3c, lo: 0x282828, lit: 0xededed, edge: 0xd8d8d8, edgeLo: 0x7a7a7a, shadow: 0.6, ambient: 0.42 },
    light: { paper: 0xf7f7f5, face: 0xffffff, hi: 0xcfcdc7, mid: 0xa5a39e, lo: 0x6c6b68, lit: 0x232326, edge: 0x2a2a2e, edgeLo: 0x77777c, shadow: 0.2, ambient: 0.3 },
  };
  const GRADIENT = [0.5, 0.68, 0.85, 1.0];
  // Named materials. In style "real" they are physically based. In style "line" each one maps to a tone.
  const MATS = {
    castAl:   { color: 0xb4b8bc, metal: 0.85, rough: 0.58, tone: "hi" },
    machined: { color: 0xdfe2e5, metal: 1.0, rough: 0.22, tone: "hi", lit: true },
    steel:    { color: 0x8e9298, metal: 1.0, rough: 0.36, tone: "mid" },
    darkSteel:{ color: 0x34373c, metal: 0.9, rough: 0.48, tone: "mid" },
    iron:     { color: 0x5a4a41, metal: 0.75, rough: 0.62, tone: "mid" },
    chrome:   { color: 0xffffff, metal: 1.0, rough: 0.07, tone: "hi" },
    brass:    { color: 0xb08d48, metal: 1.0, rough: 0.3, tone: "mid" },
    plastic:  { color: 0x17181b, metal: 0.0, rough: 0.52, tone: "lo" },
    rubber:   { color: 0x0d0d0e, metal: 0.0, rough: 0.92, tone: "lo" },
    glass:    { color: 0x05080b, metal: 0.6, rough: 0.05, tone: "lo", env: 1.4 },
    paint:    { color: 0x1b3657, metal: 0.35, rough: 0.38, clearcoat: 1, tone: "hi" },
    flat:     { color: 0x808080, metal: 0.05, rough: 0.55, tone: "mid" },
    concrete: { color: 0xaeaba3, metal: 0.0, rough: 0.9, tone: "hi" },
    light:    { color: 0xffffff, metal: 0, rough: 0.3, emissive: 0xffffff, tone: "hi", lit: true },
  };

  function gradientMap() {
    const data = new Uint8Array(GRADIENT.map((v) => Math.round(v * 255)));
    const tex = new T.DataTexture(data, GRADIENT.length, 1, T.LuminanceFormat);
    tex.minFilter = tex.magFilter = T.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }

  // ---------- geometry helpers ----------
  function roundedRect(w, d, r) {
    r = Math.min(r, w / 2, d / 2);
    const s = new T.Shape();
    s.moveTo(-w / 2 + r, -d / 2);
    s.lineTo(w / 2 - r, -d / 2); s.absarc(w / 2 - r, -d / 2 + r, r, -Math.PI / 2, 0, false);
    s.lineTo(w / 2, d / 2 - r); s.absarc(w / 2 - r, d / 2 - r, r, 0, Math.PI / 2, false);
    s.lineTo(-w / 2 + r, d / 2); s.absarc(-w / 2 + r, d / 2 - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(-w / 2, -d / 2 + r); s.absarc(-w / 2 + r, -d / 2 + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }
  // A rounded box standing on z=0, centred at origin in x,y. bevel adds a small chamfer on the top edge.
  function boxGeo({ w = 10, d = 10, h = 10, r = 0, bevel = 0, segments = 4 }) {
    const shape = roundedRect(w, d, r);
    const g = new T.ExtrudeGeometry(shape, { depth: h, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: segments });
    if (bevel > 0) g.translate(0, 0, bevel); // keep base on z=0 after the bevel
    g.computeVertexNormals();
    return g;
  }
  function cylGeo({ r = 5, h = 10, n = 32, axis = "z" }) {
    const g = new T.CylinderGeometry(r, r, h, n, 1, false);
    // CylinderGeometry is along y, centred. Rotate so it stands on z=0 (or lies along x / y).
    if (axis === "z") { g.rotateX(Math.PI / 2); g.translate(0, 0, h / 2); }
    else if (axis === "y") { g.translate(0, h / 2, 0); }
    else if (axis === "x") { g.rotateZ(-Math.PI / 2); g.translate(h / 2, 0, 0); }
    return g;
  }
  function tubeGeo(points, r = 1, { n = 10, bend = 2, closed = false } = {}) {
    const v = points.map((p) => new T.Vector3(p[0], p[1], p[2]));
    const curve = new T.CatmullRomCurve3(v, closed, "centripetal", 0.5);
    return new T.TubeGeometry(curve, Math.max(8, points.length * 12 * bend), r, n, closed);
  }
  // A side profile in the x-z plane, extruded across y. points: [x,z] or { arc:[cx,cz,r,a0,a1,clockwise] }.
  function profileGeo(points, depth, yCenter = 0) {
    const s = new T.Shape(); let first = true;
    for (const p of points) { if (p.arc) s.absarc(...p.arc); else if (first) { s.moveTo(p[0], p[1]); first = false; } else s.lineTo(p[0], p[1]); }
    const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 20 });
    g.rotateX(Math.PI / 2); g.translate(0, yCenter + depth / 2, 0);
    g.computeVertexNormals();
    return g;
  }

  // Toothed wheel for a chain or a gear train. Pitch radius = pitch / (2 sin(pi / teeth)). A roller sits in the gap at angle 0.
  function gearGeo({ teeth, pitch, thick = 2, hole = 0, axis = "z", depth = 0.3 }) {
    const R = pitch / (2 * Math.sin(Math.PI / teeth)), rr = R - pitch * depth, rt = R + pitch * depth * 0.9, da = (Math.PI * 2) / teeth, s = new T.Shape();
    for (let i = 0; i < teeth; i++) for (const [f, r] of [[0.24, rr], [0.41, rt], [0.59, rt], [0.76, rr]]) { const a = (i + f) * da, x = r * Math.cos(a), y = r * Math.sin(a); i || f > 0.3 ? s.lineTo(x, y) : s.moveTo(x, y); }
    s.closePath();
    if (hole > 0) { const h = new T.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h); }
    const g = new T.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 24 }); g.translate(0, 0, -thick / 2);
    if (axis === "y") g.rotateX(Math.PI / 2); else if (axis === "x") g.rotateY(Math.PI / 2);
    g.userData.pitchRadius = R; return g;
  }
  const pitchRadius = (teeth, pitch) => pitch / (2 * Math.sin(Math.PI / teeth));
  // Path of a chain, belt or cable round a closed loop of wheels, in the x-z plane.
  // wheels: [{ c: [x, z], r, s: +1 | -1, y }]. s is the turning sense seen with x to the right and z up: +1 anticlockwise, -1 clockwise.
  // Returns { length, at(distance) -> { x, y, z, ang }, arcs: [length on each wheel] }.
  function wrapPath(wheels) {
    const n = wheels.length, tan = [], seg = [];
    for (let i = 0; i < n; i++) {
      const A = wheels[i], B = wheels[(i + 1) % n], D = [B.c[0] - A.c[0], B.c[1] - A.c[1]], d = Math.hypot(D[0], D[1]), k = B.r * B.s - A.r * A.s;
      const pd = Math.atan2(D[1], D[0]), ac = Math.acos(Math.max(-1, Math.min(1, -k / d)));
      for (const sg of [1, -1]) { const q = [Math.cos(pd + sg * ac), Math.sin(pd + sg * ac)], u = [-q[1], q[0]], L = D[0] * u[0] + D[1] * u[1]; if (L > 0) { tan.push({ a: [A.c[0] + A.r * A.s * q[0], A.c[1] + A.r * A.s * q[1]], b: [B.c[0] + B.r * B.s * q[0], B.c[1] + B.r * B.s * q[1]], L, u }); break; } }
    }
    let length = 0; const arcs = [];
    for (let i = 0; i < n; i++) {
      const t = tan[i], j = (i + 1) % n, W = wheels[j], A = wheels[i];
      seg.push({ line: true, from: length, len: t.L, t, ya: A.y || 0, yb: W.y || 0 }); length += t.L;
      const a0 = Math.atan2(t.b[1] - W.c[1], t.b[0] - W.c[0]), o = tan[j].a, a1 = Math.atan2(o[1] - W.c[1], o[0] - W.c[0]);
      const sweep = (((a1 - a0) * W.s) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      seg.push({ from: length, len: sweep * W.r, a0, sweep, W }); arcs[j] = sweep * W.r; length += sweep * W.r;
    }
    const at = (dist) => {
      dist = ((dist % length) + length) % length; let g = seg[seg.length - 1];
      for (const q of seg) if (dist < q.from + q.len) { g = q; break; }
      const f = g.len ? (dist - g.from) / g.len : 0;
      if (g.line) return { x: g.t.a[0] + g.t.u[0] * g.len * f, z: g.t.a[1] + g.t.u[1] * g.len * f, y: g.ya + (g.yb - g.ya) * f, ang: Math.atan2(g.t.u[1], g.t.u[0]) };
      const a = g.a0 + g.W.s * g.sweep * f; return { x: g.W.c[0] + g.W.r * Math.cos(a), z: g.W.c[1] + g.W.r * Math.sin(a), y: g.W.y || 0, ang: a + g.W.s * Math.PI / 2 };
    };
    return { length, at, arcs };
  }
  // Point on a hop from a to b: t from 0 to 1, lifted by `lift` in the middle. For messages that travel between stations.
  const hop = (a, b, t, lift = 0) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t + lift * Math.sin(Math.PI * t)];
  // Flat plate standing on z = 0 with rectangular holes: { w, d, h, holes: [{ x, y, w, d }] }.
  function plateGeo({ w, d, h, holes = [] }) {
    const s = new T.Shape(); s.moveTo(-w / 2, -d / 2); s.lineTo(w / 2, -d / 2); s.lineTo(w / 2, d / 2); s.lineTo(-w / 2, d / 2); s.closePath();
    for (const o of holes) { const p = new T.Path(); p.moveTo(o.x - o.w / 2, o.y - o.d / 2); p.lineTo(o.x - o.w / 2, o.y + o.d / 2); p.lineTo(o.x + o.w / 2, o.y + o.d / 2); p.lineTo(o.x + o.w / 2, o.y - o.d / 2); p.closePath(); s.holes.push(p); }
    return new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: false });
  }
  // Round part from a profile of [radius, height] pairs, spun about an axis.
  function latheGeo(profile, { axis = "z", n = 36 } = {}) {
    const g = new T.LatheGeometry(profile.map((p) => new T.Vector2(Math.max(p[0], 0.0001), p[1])), n);
    if (axis === "z") g.rotateX(Math.PI / 2); else if (axis === "x") g.rotateZ(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  }
  function torusGeo({ R = 5, r = 0.5, axis = "z", n = 32 } = {}) {
    const g = new T.TorusGeometry(R, r, 10, n);
    if (axis === "x") g.rotateY(Math.PI / 2); else if (axis === "y") g.rotateX(Math.PI / 2);
    return g;
  }
  // Scroll housing (turbo or pump): a tube wound once round the axis x, growing from r0 to r1.
  function voluteGeo({ R = 3.5, r0 = 1.2, r1 = 2.5, squash = 1 } = {}) {
    const f = (u, v, t) => { const a = u * Math.PI * 1.96, b = v * Math.PI * 2, rt = r0 + (r1 - r0) * u, q = R + rt * Math.cos(b); t.set(rt * Math.sin(b) * squash, q * Math.cos(a), q * Math.sin(a)); };
    const g = new T.ParametricGeometry(f, 56, 14); g.computeVertexNormals(); return g;
  }
  // Closed cross-section of a rounded body: half width W, from z = zb to z = zt. exp 2 is an ellipse, 5 is a soft box.
  function superSection(W, zb, zt, exp = 4.5, count = 44) {
    const sp = (c) => Math.sign(c) * Math.pow(Math.abs(c), 2 / exp), zc = (zb + zt) / 2, hh = (zt - zb) / 2;
    return Array.from({ length: count }, (_, j) => { const a = (j / count) * Math.PI * 2; return [W * sp(Math.cos(a)), zc + hh * sp(Math.sin(a))]; });
  }
  // Interpolate rows of numbers (first column is x) with a Catmull-Rom spline. Returns `steps + 1` rows.
  function sweep(keys, steps = 48) {
    const n = keys.length, out = [];
    const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
    for (let s = 0; s <= steps; s++) {
      const f = (s / steps) * (n - 1), i = Math.min(n - 2, Math.floor(f)), t = f - i;
      const k = (d) => keys[Math.max(0, Math.min(n - 1, i + d))];
      out.push(keys[0].map((_, c) => cr(k(-1)[c], k(0)[c], k(1)[c], k(2)[c], t)));
    }
    return out;
  }
  // Skin a row of sections [{ x, pts: [[y, z], ...] }] into one smooth surface. filter(i, j, n) keeps or drops a panel.
  function loftGeo(sections, { filter, caps = true } = {}) {
    const n = sections[0].pts.length, pos = [], idx = [];
    sections.forEach((s) => s.pts.forEach((p) => pos.push(s.x, p[0], p[1])));
    for (let i = 0; i < sections.length - 1; i++) for (let j = 0; j < n; j++) {
      if (filter && !filter(i, j, n, sections[i].x)) continue;
      const a = i * n + j, b = i * n + ((j + 1) % n), c = (i + 1) * n + j, d = (i + 1) * n + ((j + 1) % n);
      idx.push(a, c, b, b, c, d);
    }
    if (caps && !filter) for (const [si, flip] of [[0, false], [sections.length - 1, true]]) {
      const s = sections[si], c = pos.length / 3, cy = s.pts.reduce((t, p) => t + p[0], 0) / n, cz = s.pts.reduce((t, p) => t + p[1], 0) / n;
      pos.push(s.x, cy, cz);
      for (let j = 0; j < n; j++) { const a = si * n + j, b = si * n + ((j + 1) % n); flip ? idx.push(c, a, b) : idx.push(c, b, a); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  // ---------- the figure ----------
  const VERSION = "0.7";
  const HILITE = 0x2f8cff;   // the one colour that means "selected"
  class Figure {
    constructor(mount, { theme = "dark", style = "line", width = 640, height = 420, azimuth = 40, elevation = 32, hint = "", readout = "" } = {}) {
      this.mount = typeof mount === "string" ? document.querySelector(mount) : mount;
      this.theme = THEMES[theme] ? theme : "dark";
      this.T = THEMES[this.theme];
      this.style = style === "real" ? "real" : "line"; this.lastInput = performance.now(); this.snap = false;
      this.width = width; this.height = height;
      this.azimuth = azimuth; this.elevation = elevation;
      this.parts = [];          // every mesh we made, with its tone
      this.updaters = [];       // per-frame fns (dt, t)
      this.channels = {};       // named scalars that ease toward a target: { v, to, tau }
      this.cut = null;          // clipping plane or null
      this.view = null; this.viewTo = null; this.focusBox = null;
      this.gradient = gradientMap();
      this.running = false; this.visible = false; this.last = 0; this.time = 0;
      this.reduced = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
      global.mech.current = this;
      this.#dom(hint, readout);
      this.#scene();
      this.#input();
    }
    #dom(hint, readout) {
      const m = this.mount;
      m.classList.add("mech");
      m.innerHTML = `<div class="mech-stage" tabindex="0" role="img"><canvas></canvas><div class="mech-over"><svg class="mech-leaders"></svg></div><div class="mech-panel" hidden></div></div><div class="mech-foot"><span class="mech-hint">${hint}</span><code class="mech-readout">${readout}</code></div>`;
      this.stage = m.querySelector(".mech-stage");
      this.canvas = m.querySelector("canvas");
      this.readoutEl = m.querySelector(".mech-readout");
      this.over = m.querySelector(".mech-over"); this.leaders = m.querySelector(".mech-leaders"); this.panel = m.querySelector(".mech-panel"); this.stage.after(this.panel);
      this.infoDict = {}; this.labelList = []; this.labelSet = null; this.flowList = []; this.flowSet = null; this.selected = null; this.pickHandler = null;
    }
    #scene() {
      const r = (this.renderer = new T.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true }));
      r.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
      r.setSize(this.width, this.height, false);
      r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
      r.localClippingEnabled = true;
      r.setClearColor(0x000000, 0);
      const s = (this.scene = new T.Scene());
      this.root = new T.Group(); s.add(this.root);
      const cam = (this.camera = new T.OrthographicCamera(-1, 1, 1, -1, -2000, 2000));
      cam.up.set(0, 0, 1);
      const real = this.style === "real";
      if (real) {
        r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = this.theme === "dark" ? 0.95 : 1.1;
        const es = new T.Scene(), sg = new T.SphereGeometry(60, 32, 16), col = [];
        const top = this.theme === "dark" ? 0.22 : 0.7, low = this.theme === "dark" ? 0.01 : 0.2;
        for (let i = 0; i < sg.attributes.position.count; i++) { const k = Math.pow((sg.attributes.position.getZ(i) / 60 + 1) / 2, 1.6), v = low + (top - low) * k; col.push(v, v, v * 1.04); }
        sg.setAttribute("color", new T.Float32BufferAttribute(col, 3));
        es.add(new T.Mesh(sg, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
        const panel = (w, h, x, y, z, k) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k, k, k), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
        panel(40, 24, -10, -22, 48, 5); panel(22, 44, -50, -20, 14, 2.6); panel(20, 36, 46, 26, 16, 1.2); panel(60, 8, 10, -52, 10, 1.6);
        const pm = new T.PMREMGenerator(r); s.environment = pm.fromScene(es, 0.03).texture; pm.dispose();
      }
      s.add(new T.AmbientLight(0xffffff, real ? 0.08 : this.T.ambient));
      const key = (this.key = new T.DirectionalLight(0xffffff, real ? 1.5 : 0.95));
      key.position.set(-120, -220, 300);           // back-left and high: tops lightest, right faces darkest
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.radius = 4; key.shadow.bias = -0.0008;
      s.add(key);
      const fill = new T.DirectionalLight(0xffffff, real ? 0.25 : 0.18); fill.position.set(200, 120, 80); s.add(fill);
      // ground that only receives shadow
      const gm = new T.ShadowMaterial({ opacity: this.T.shadow });
      this.ground = new T.Mesh(new T.PlaneGeometry(4000, 4000), gm);
      this.ground.receiveShadow = true; this.ground.position.z = -0.01;
      s.add(this.ground);
    }
    #input() {
      const st = this.stage;
      let drag = null;
      st.addEventListener("pointerdown", (e) => { this.touch(); drag = { x: e.clientX, y: e.clientY, az: this.azimuth, el: this.elevation }; st.setPointerCapture(e.pointerId); this.run(); });
      st.addEventListener("pointermove", (e) => { if (!drag) return; this.azimuth = drag.az + (e.clientX - drag.x) * 0.4; this.elevation = Math.max(8, Math.min(80, drag.el + (e.clientY - drag.y) * 0.3)); this.fit(); this.run(); });
      st.addEventListener("pointerup", (e) => { const d = drag; drag = null; if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5 && e.target === this.canvas) this.#pick(e); });
      st.addEventListener("keydown", (e) => {
        this.touch();
        if (e.key === "e" || e.key === "E") { this.setExplode(this.ch("explode") < 0.5 ? 1 : 0); e.preventDefault(); }
        if (e.key === "c" || e.key === "C") { this.toggleCut(); e.preventDefault(); }
        if (e.key === "ArrowLeft") { this.azimuth -= 15; this.fit(); e.preventDefault(); }
        if (e.key === "ArrowRight") { this.azimuth += 15; this.fit(); e.preventDefault(); }
        if (e.key === "ArrowUp") { this.elevation = Math.min(80, this.elevation + 8); this.fit(); e.preventDefault(); }
        if (e.key === "ArrowDown") { this.elevation = Math.max(8, this.elevation - 8); this.fit(); e.preventDefault(); }
        if ((e.key === " " || e.key === "Enter") && this.onPress) { this.onPress(e); e.preventDefault(); }
        this.run();
      });
      if (global.IntersectionObserver) new IntersectionObserver((en) => { this.visible = en[en.length - 1].isIntersecting; if (this.visible) this.run(); }, { rootMargin: "120px 0px" }).observe(st);
      else this.visible = true;
    }

    // ---- materials ----
    material(tone = "hi", { lit = false, color, mat, side } = {}) {
      let m;
      if (this.style === "real") {
        const d = MATS[mat] || MATS[color !== undefined ? "flat" : lit ? "machined" : { hi: "castAl", mid: "steel", lo: "plastic" }[tone] || "castAl"];
        const o = { color: color !== undefined ? color : d.color, metalness: d.metal, roughness: d.rough, envMapIntensity: d.env || 1 };
        m = d.clearcoat ? new T.MeshPhysicalMaterial(Object.assign(o, { clearcoat: d.clearcoat, clearcoatRoughness: 0.08 })) : new T.MeshStandardMaterial(o);
        if (d.emissive) m.emissive.set(d.emissive);
      } else {
        const d = MATS[mat];
        if (d) { tone = d.tone; lit = lit || !!d.lit; }
        const c = color !== undefined ? color : lit ? this.T.lit : this.T[tone] ?? this.T.hi;
        m = new T.MeshToonMaterial({ color: c, gradientMap: this.gradient });
      }
      if (side === "double") m.side = T.DoubleSide;
      m.clippingPlanes = this.cut ? [this.cut] : [];
      m.clipShadows = true;
      return m;
    }
    // ---- adding parts ----
    // geo: a BufferGeometry standing on z=0. opts: tone, lit, at:[x,y,z], rot:[rx,ry,rz], edges (deg threshold or false), name, explode:[dx,dy,dz], group
    add(geo, { tone = "hi", lit = false, color, mat, side, at = [0, 0, 0], rot = [0, 0, 0], edges = 28, edgeTone, name, explode, channel = "explode", group, shadow = true, tag, info } = {}) {
      const mesh = new T.Mesh(geo, this.material(tone, { lit, color, mat, side }));
      const real = this.style === "real"; if (MATS[mat] && !real) { tone = MATS[mat].tone; lit = lit || !!MATS[mat].lit; }
      mesh.castShadow = shadow; mesh.receiveShadow = true;
      mesh.position.set(...at); mesh.rotation.set(...rot);
      mesh.name = name || "";
      if (edges !== false) {
        const eg = new T.EdgesGeometry(geo, edges);
        const em = new T.LineBasicMaterial({ color: edgeTone === "lo" ? this.T.edgeLo : lit ? this.T.lit : tone === "lo" ? this.T.edgeLo : this.T.edge, transparent: true, opacity: tone === "lo" ? 0.7 : 0.9 });
        em.userData.base = em.opacity;
        if (real) { em.color.set(this.T.edge); em.opacity = 0; }
        em.userData.color = em.color.getHex();
        em.clippingPlanes = this.cut ? [this.cut] : [];
        const lines = new T.LineSegments(eg, em);
        lines.renderOrder = 1; lines.visible = !real;
        mesh.add(lines);
        mesh.userData.edges = lines;
      }
      mesh.userData.rest = mesh.position.clone();
      mesh.userData.explode = explode ? new T.Vector3(...explode) : null;
      mesh.userData.channel = channel; mesh.userData.tag = tag; if (info) mesh.userData.info = info; mesh.userData.alpha = 1; mesh.userData.alphaTo = 1; mesh.userData.shadow = shadow;
      (group || this.root).add(mesh);
      this.parts.push(mesh);
      return mesh;
    }
    group(opts = {}) {
      const g = new T.Group();
      if (opts.at) g.position.set(...opts.at);
      if (opts.rot) g.rotation.set(...opts.rot);
      g.userData.rest = g.position.clone();
      g.userData.explode = opts.explode ? new T.Vector3(...opts.explode) : null;
      g.userData.channel = opts.channel || "explode"; if (opts.info) g.userData.info = opts.info;
      (opts.group || this.root).add(g);
      this.parts.push(g);
      return g;
    }
    // sugar
    box(o, opts) { return this.add(boxGeo(o), opts); }
    cyl(o, opts) { return this.add(cylGeo(o), opts); }
    lathe(profile, o, opts) { return this.add(latheGeo(profile, o), Object.assign({ edges: 50 }, opts)); }
    torus(o, opts) { return this.add(torusGeo(o), Object.assign({ edges: false }, opts)); }
    tube(points, r, opts = {}) { return this.add(tubeGeo(points, r, opts), Object.assign({ edges: false, tone: "mid" }, opts)); }
    // small decorations
    screws(points, r = 0.6, opts = {}) { return points.map(([x, y, z]) => this.cyl({ r, h: 0.3, n: 10 }, Object.assign({ tone: "lo", at: [x, y, z], edges: false, shadow: false }, opts))); }
    led(at, r = 0.9, opts = {}) {
      const pass = { group: opts.group, tag: opts.tag, explode: opts.explode, channel: opts.channel, edges: false, shadow: false };
      this.cyl({ r: r + 0.4, h: 0.4, n: 12 }, Object.assign({ mat: "plastic", at }, pass));
      const dome = this.cyl({ r, h: 0.6, n: 12 }, Object.assign({ tone: "mid", at: [at[0], at[1], at[2] + 0.4] }, pass));
      dome.userData.led = { on: new T.Color(opts.color || this.T.lit), off: new T.Color(this.T.mid) };
      return dome;
    }
    setLed(mesh, on) { const l = mesh.userData.led; if (!l || l.state === on) return; l.state = on; mesh.material.color.copy(on ? l.on : l.off); mesh.material.emissive.copy(on ? l.on : new T.Color(0)).multiplyScalar(0.6); }
    // glow: 0..1 heat on a part (emissive), for hot or active things
    glow(mesh, k, color = 0xff8a2a) { mesh.material.emissive.set(color).multiplyScalar(Math.max(0, Math.min(1, k))); }
    // ghost: fade parts to an opacity (0 hides them). Accepts meshes, groups or tags.
    ghost(what, alpha) {
      const set = (o) => o.traverse((m) => { if (m.isMesh && m.userData.alphaTo !== undefined) m.userData.alphaTo = alpha; });
      for (const w of [].concat(what)) { if (typeof w === "string") this.parts.forEach((p) => p.userData.tag === w && set(p)); else set(w); }
      this.run();
    }
    // channels: named numbers that ease to a target. Read with ch(name).
    to(name, value, tau = 0.25) { const c = (this.channels[name] ||= { v: 0, to: 0, tau }); c.to = value; c.tau = tau; this.run(); }
    ch(name) { return this.channels[name] ? this.channels[name].v : 0; }
    fins(count, { x = 0, y = 0, z = 0, w = 1.2, d = 10, h = 2.5, gap = 3 } = {}, opts = {}) {
      const out = [];
      for (let i = 0; i < count; i++) out.push(this.box({ w, d, h, r: 0.2 }, Object.assign({ tone: "mid", at: [x + i * gap, y, z], edges: 40 }, opts)));
      return out;
    }
    knob({ r = 3, h = 2.6, knurls = 24 } = {}, opts = {}) {
      const g = this.group(opts);
      this.cyl({ r, h, n: 32 }, { tone: "mid", group: g });
      for (let i = 0; i < knurls; i++) { const a = (i / knurls) * Math.PI * 2; this.box({ w: 0.35, d: 0.6, h: h * 0.8 }, { tone: "lo", at: [Math.cos(a) * r, Math.sin(a) * r, h * 0.1], rot: [0, 0, a], edges: false, shadow: false, group: g }); }
      this.box({ w: r * 0.8, d: 0.4, h: 0.3 }, { tone: "hi", lit: true, at: [-r * 0.35, 0, h], edges: false, shadow: false, group: g });
      return g;
    }

    // ---- camera ----
    // focus(target?, { azimuth, elevation, pad }): ease the camera to frame an object (default: everything).
    focus(target, { azimuth, elevation, pad = 1.12, snap = false } = {}) {
      if (azimuth !== undefined) this.azimuth = azimuth;
      if (elevation !== undefined) this.elevation = elevation;
      this.focusBox = target && target.isBox3 ? target.clone() : new T.Box3().setFromObject(target || this.root);
      this.pad = pad;
      this.fit(snap);
      this.run();
    }
    fit(snap = false) {
      const box = this.focusBox || (this.focusBox = new T.Box3().setFromObject(this.root));
      if (box.isEmpty()) return;
      const a = (this.azimuth * Math.PI) / 180, e = (this.elevation * Math.PI) / 180;
      const dir = new T.Vector3(Math.sin(a) * Math.cos(e), -Math.cos(a) * Math.cos(e), Math.sin(e));
      const c = box.getCenter(new T.Vector3());
      const right = new T.Vector3().crossVectors(new T.Vector3(0, 0, 1), dir).normalize();
      const up = new T.Vector3().crossVectors(dir, right).normalize();
      let hw = 0, hh = 0;
      for (let i = 0; i < 8; i++) {
        const p = new T.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(c);
        hw = Math.max(hw, Math.abs(p.dot(right))); hh = Math.max(hh, Math.abs(p.dot(up)));
      }
      const asp = this.width / this.height;
      const half = Math.max(hh, hw / asp) * (this.pad || 1.12);
      this.viewTo = { c, half, az: this.azimuth, el: this.elevation };
      if (snap || !this.view) this.view = { c: c.clone(), half, az: this.azimuth, el: this.elevation };
      if (!this.shadowSet) {
        const all = new T.Box3().setFromObject(this.root), ac = all.getCenter(new T.Vector3());
        const sz = Math.max(all.max.x - all.min.x, all.max.y - all.min.y) * 0.75;
        Object.assign(this.key.shadow.camera, { left: -sz, right: sz, top: sz, bottom: -sz, near: 1, far: 1600 });
        this.key.target.position.copy(ac); this.scene.add(this.key.target);
        this.key.position.copy(ac).add(new T.Vector3(-140, -260, 420));
        this.key.shadow.camera.updateProjectionMatrix();
        this.shadowSet = true;
      }
      this.fitted = true;
    }
    #applyView() {
      const v = this.view, a = (v.az * Math.PI) / 180, e = (v.el * Math.PI) / 180;
      const dir = new T.Vector3(Math.sin(a) * Math.cos(e), -Math.cos(a) * Math.cos(e), Math.sin(e));
      this.camera.position.copy(v.c).addScaledVector(dir, 900);
      this.camera.lookAt(v.c);
      const asp = this.width / this.height;
      Object.assign(this.camera, { left: -v.half * asp, right: v.half * asp, top: v.half, bottom: -v.half });
      this.camera.updateProjectionMatrix();
    }

    // ---- motion ----
    onFrame(fn) { this.updaters.push(fn); }
    setExplode(t, channel = "explode") { this.to(channel, Math.max(0, Math.min(1, t))); }
    toggleCut() { if (this.cut) this.setCut(null); else this.setCut(this.cutPlane || { normal: [0, 1, 0], at: 0 }); }
    // plane: { normal:[x,y,z], at: distance } keeps the half-space on the normal's side
    setCut(plane) {
      this.cutPlane = plane || this.cutPlane;
      this.cut = plane ? new T.Plane(new T.Vector3(...plane.normal).normalize(), -plane.at) : null;
      for (const p of this.parts) {
        if (!p.isMesh) continue;
        p.material.clippingPlanes = this.cut ? [this.cut] : [];
        if (p.userData.edges) p.userData.edges.material.clippingPlanes = this.cut ? [this.cut] : [];
      }
      this.run();
    }
    spin(obj, axis = "z", rpm = 60, scale = 1) { this.onFrame((dt) => { const w = (rpm * scale) / 60 * 2 * Math.PI; obj.rotation[axis] += w * dt; }); }
    shadow(k) { this.ground.material.opacity = this.T.shadow * k; }
    // ---- teaching layer ----
    // describe({ key: { name, role, fact } }): what each part is. Parts carry `info: key`.
    describe(dict) { Object.assign(this.infoDict, dict); }
    infoOf(o) { while (o) { if (o.userData && o.userData.info) return o.userData.info; o = o.parent; } return null; }
    find(key) { let hit = null; this.root.traverse((o) => { if (!hit && o.userData.info === key) hit = o; }); return hit; }
    #pick(e) {
      const r = this.canvas.getBoundingClientRect(), ray = new T.Raycaster();
      ray.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
      const list = this.parts.filter((p) => p.isMesh && p.visible && p.userData.alpha > 0.25 && p.userData.tag !== "flow");
      let key = null; for (const h of ray.intersectObjects(list, false)) { key = this.infoOf(h.object); if (key) break; }
      if (this.pickHandler) this.pickHandler(key); else this.select(key);
    }
    select(key) {
      this.selected = key && this.infoDict[key] ? key : null;
      const d = this.selected && this.infoDict[this.selected];
      if (!this.pickHandler) { this.say(d ? this.infoHtml(d) : ""); if (d && this.panel.scrollIntoView) this.panel.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
      this.run();
    }
    say(html) { this.panel.innerHTML = html; this.panel.hidden = !html; }
    // The part panel. New form: what (what it is), does (what it does), how (how it does it), one short sentence each.
    // Old form: role. src is one fact id or a list. Every source shows as a tag with its status, so the reader sees what is sourced.
    infoHtml(d) {
      const row = (head, text) => (text ? `<span class="row"><u>${head}</u>${text}</span>` : "");
      const body = d.what || d.does || d.how ? row("What it is", d.what) + row("What it does", d.does) + row("How", d.how) : `<span>${d.role || ""}</span>`;
      const word = { sourced: "sourced", model: "worked out", assumed: "assumed", illustrative: "illustrative" }, F = this.factList || [];
      const tags = [].concat(d.src || []).map((id) => F.find((f) => f.id === id)).filter(Boolean).map((f) => `<i class="s-${f.status}">${word[f.status] || f.status}</i>${f.status === "sourced" ? f.source || "" : f.status === "model" ? "from the model" : f.status === "assumed" ? "typical, not looked up" : "made for this figure"}`);
      for (let i = tags.length - 1; i > 0; i--) if (tags.indexOf(tags[i]) < i) tags.splice(i, 1);   // one tag for each source
      return `<b>${d.name}</b>${body}${d.fact ? `<em>${d.fact}</em>` : ""}<small>${tags.length ? tags.join(" &nbsp; ") : "<i>general</i>common knowledge, no source"}</small>`;
    }
    // label(key, { text, on, set, pin }): a pointer to a part. `on` is an object or a world point. Show a set with labels(set).
    label(key, { text, on, set = "all", pin = false, offset, box = false, auto } = {}) {
      const el = document.createElement("div"); el.className = "mech-label" + (pin ? " pin" : "") + (box ? " box" : "") + (this.infoDict[key] ? " can" : ""); el.textContent = text || (this.infoDict[key] ? this.infoDict[key].name : key); el.hidden = true; this.over.appendChild(el);
      el.addEventListener("pointerdown", (e) => e.stopPropagation());
      el.addEventListener("click", (e) => { e.stopPropagation(); if (!this.infoDict[key]) return; this.touch(); if (this.pickHandler) this.pickHandler(key); else this.select(this.selected === key ? null : key); });
      const obj = Array.isArray(on) ? null : on || this.find(key); let local = null, probe = null;
      if (obj) { this.root.updateMatrixWorld(true); const c = new T.Box3().setFromObject(obj).getCenter(new T.Vector3()); if (offset) c.add(new T.Vector3(...offset)); local = obj.worldToLocal(c); obj.traverse((m) => { if (!probe && m.isMesh) probe = m; }); }
      // auto: the kit may move the pointer to a spot on the part that the reader can see. A point or an offset from the author stays where it is.
      const L = { key, el, obj, local, probe, world: Array.isArray(on) ? new T.Vector3(...on) : null, set, pin, scope: on && !Array.isArray(on) ? on : null,
        auto: auto !== undefined ? !!auto : !pin && !!obj && !offset, text(t) { el.textContent = t; L.w = 0; } };
      this.labelList.push(L); return L;
    }
    labels(set) { this.labelSet = set || null; this.run(); }
    // flow(points, opts): dots that move along a path. Show a set with flows(set).
    flow(points, { color = 0x4aa8ff, count = 8, speed = 0.3, r = 0.8, group, set = "all" } = {}) {
      const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)), false, "centripetal", 0.5), dots = [];
      for (let i = 0; i < count; i++) { const m = this.add(new T.SphereGeometry(r, 10, 8), { color, group, tag: "flow", edges: false, shadow: false }); m.material.emissive.set(color); m.visible = false; dots.push(m); }
      const f = { curve, dots, speed, set, rate: 1 }; this.flowList.push(f); return f;
    }
    flows(set) { this.flowSet = set || null; this.run(); }
    // lesson(steps): a guided walk. steps: [{ title, text, go() }]. Returns { open(i), close() }.
    lesson(steps, { onClose } = {}) {
      const el = document.createElement("div"); el.className = "mech-lesson"; el.hidden = true;
      el.innerHTML = `<div class="row"><b></b><span class="n"></span><button data-d="-1" aria-label="Previous step">Back</button><button data-d="1" aria-label="Next step">Next</button><button data-d="0" aria-label="Close lesson">Close</button></div><p></p>`;
      this.stage.after(el);
      let i = 0;
      const show = () => { el.querySelector("b").textContent = steps[i].title; el.querySelector(".n").textContent = "Step " + (i + 1) + " of " + steps.length; el.querySelector("p").textContent = steps[i].text; steps[i].go(); this.run(); };
      const api = { open: (k = 0) => { i = k; el.hidden = false; this.inLesson = true; show(); }, close: () => { el.hidden = true; this.inLesson = false; onClose && onClose(); } };
      el.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; this.touch(); const d = +b.dataset.d; if (!d) return api.close(); i = Math.max(0, Math.min(steps.length - 1, i + d)); show(); });
      return api;
    }
    // quiz(questions): [{ ask, key }]. The reader clicks the part. Returns { start(), stop() }.
    quiz(questions, { onEnd } = {}) {
      let i = 0, score = 0, lock = false;
      const ask = () => this.say(`<b>Question ${i + 1} of ${questions.length}</b><span>${questions[i].ask}</span>`);
      const stop = () => { this.pickHandler = null; this.say(""); onEnd && onEnd(); };
      return { stop, start: () => { i = 0; score = 0; lock = false; this.select(null); this.pickHandler = (key) => {
        if (lock) return; const q = questions[i], d = this.infoDict[key];
        if (key === q.key || (q.also || []).includes(key)) { score++; lock = true; this.selected = key; this.say(`<b>Correct</b><span>${d.name}: ${d.does || d.role || ""}</span>`); }
        else { this.say(`<b>Question ${i + 1} of ${questions.length}</b><span>${q.ask}</span><em>${d ? "That is the " + d.name.toLowerCase() + ". Try again." : "Click a part."}</em>`); if (!d) return; lock = false; return; }
        setTimeout(() => { lock = false; this.selected = null; i++; if (i < questions.length) ask(); else { this.pickHandler = null; this.say(`<b>Done</b><span>${score} of ${questions.length} correct.</span>`); onEnd && onEnd(); } }, 1500);
      }; ask(); } };
    }
    plate(o, opts) { return this.add(plateGeo(o), opts); }
    gear(o, opts) { return this.add(gearGeo(o), Object.assign({ edges: 50 }, opts)); }
    #ends(mesh) { const up = new T.Vector3(0, 0, 1), d = new T.Vector3(); mesh.setEnds = (a, b) => { d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = d.length() || 1e-6; mesh.position.set(a[0], a[1], a[2]); mesh.quaternion.setFromUnitVectors(up, d.divideScalar(len)); mesh.scale.z = len; return mesh; }; return mesh; }
    // link(a, b): a bar between two points. Call mesh.setEnds(a, b) each frame when the points move.
    link(a, b, { w = 3, d = 3, r = 0.8 } = {}, opts) { return this.#ends(this.add(boxGeo({ w, d, h: 1, r }), opts)).setEnds(a, b); }
    // spring(a, b): a coil between two points that stretches with them.
    spring(a, b, { r = 3, turns = 8, wire = 0.5 } = {}, opts) {
      const pts = []; for (let i = 0; i <= turns * 12; i++) { const t = i / (turns * 12), g = t * turns * Math.PI * 2; pts.push([r * Math.cos(g), r * Math.sin(g), t]); }
      return this.#ends(this.add(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(...p))), turns * 16, wire, 6, false), Object.assign({ edges: false }, opts))).setEnds(a, b);
    }
    // chain({ count, pitch, width }): links that follow a wrapPath. Call chain.place(path, phase) each frame.
    chain({ count, pitch, width = 7, height = 8 }, opts = {}) {
      const links = [];
      for (let i = 0; i < count; i++) {
        const g = boxGeo({ w: pitch * 1.02, d: i % 2 ? width : width * 0.6, h: height, r: height * 0.42 }); g.rotateX(Math.PI / 2); g.translate(pitch / 2, i % 2 ? width / 2 : width * 0.3, 0);
        const m = this.add(g, Object.assign({ mat: i % 2 ? "steel" : "darkSteel", edges: false }, opts)); links.push(m);
      }
      return { links, count, pitch, place(path, phase = 0) { const step = path.length / count; for (let i = 0; i < count; i++) { const a = path.at((i + phase) * step), b = path.at((i + 1 + phase) * step); links[i].position.set(a.x, a.y, a.z); links[i].rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); } } };
    }
    // ---- accuracy ----
    // facts([{ id, claim, source, url, status }]): status is "sourced", "model" (derived), "assumed" (typical value) or "illustrative" (made up).
    // road({ length, width, x, pitch }): tarmac, edge lines, kerbs and seams under a subject that stays put.
    // move(d) scrolls it by d and wraps with no join. Roll a wheel of radius r by d / r for the same d.
    road({ length = 800, width = 360, x = 0, pitch = 60, kerbs = true, lines = true, seams = true, tag = "road" } = {}) {
      const real = this.style === "real", o = { tag, edges: false, shadow: false, mat: "rubber" };
      const base = this.group({ at: [x, 0, 0] }), track = this.group({ group: base }), wrap = 2 * pitch;
      const slab = this.box({ w: length, d: width, h: 2 }, Object.assign({}, o, { group: base, at: [0, 0, -2.02] }, real ? { color: 0x0c0e12 } : { tone: "lo" }));
      if (real) slab.material.envMapIntensity = 0.12;   // a flat top faces the key light and the studio, so it needs a very dark base to read as tarmac
      if (lines) for (const s of [-1, 1]) this.box({ w: length, d: 5, h: 0.3 }, Object.assign({}, o, { group: base, color: 0xdadada, at: [0, s * (width / 2 - 38), -0.02] }));
      const hi = Math.floor((length / 2 - pitch / 2) / pitch), lo = -Math.floor((length / 2 - pitch / 2 - wrap) / pitch);
      for (let i = lo; i <= hi; i++) {
        if (kerbs) for (const s of [-1, 1]) this.box({ w: pitch, d: 22, h: 1.8, r: 0.4 }, Object.assign({}, o, { group: track, color: i % 2 ? 0xcfcfcf : 0x8e2a1f, at: [i * pitch, s * (width / 2 - 18), -0.02] }));
        if (seams && i % 2 === 0) this.box({ w: 3, d: width - 70, h: 0.2 }, Object.assign({}, o, { group: track, color: 0x3c4149, at: [i * pitch, 0, -0.02] }));
      }
      return { group: base, track, slab, pitch, wrap, span: [lo * pitch - pitch / 2 - wrap, hi * pitch + pitch / 2], length,
        move(d) { track.position.x = -((((-track.position.x + d) % wrap) + wrap) % wrap); } };
    }
    facts(list) { this.factList = (this.factList || []).concat(list); }
    // check(name, ok, detail): a test that the model agrees with the facts. Failures show in audit().
    check(name, ok, detail = "") { (this.checks = this.checks || []).push({ name, ok: !!ok, detail: String(detail) }); }
    // edge lines of one part: a bright outline when selected, faint on a ghost, the normal look otherwise
    #edgeLook(p) {
      const u = p.userData; if (!u.edges) return;
      const em = u.edges.material;
      if (u.hl && u.alpha > 0.004) { em.color.setHex(HILITE); em.opacity = 0.95; u.edges.visible = true; return; }
      em.color.setHex(em.userData.color);
      if (this.style === "real") { em.opacity = u.alpha < 0.6 && u.alpha > 0.004 ? 0.34 : 0; u.edges.visible = em.opacity > 0; }
      else { em.opacity = em.userData.base * Math.min(1, u.alpha * 2.2 + (u.alpha > 0.004 ? 0.12 : 0)); u.edges.visible = true; }
    }
    // ---- label anchors that find a clear view ----
    #solid() { return this.parts.filter((m) => m.isMesh && m.visible && m.userData.alpha > 0.6 && m.userData.tag !== "flow"); }
    // what is in front of world point w, seen from the camera? null when the view to it is clear, or the part of the same key is what you see.
    #blocker(key, w, solid) {
      const ray = (this.ray ||= new T.Raycaster()), ndc = w.clone().project(this.camera);
      ray.setFromCamera(new T.Vector2(ndc.x, ndc.y), this.camera);
      const hit = ray.intersectObjects(solid, false)[0];
      return hit && this.infoOf(hit.object) !== key && hit.distance < ray.ray.origin.distanceTo(w) - 1 ? hit.object : null;
    }
    #labelOn(L) { return !L.pin && this.labelSet && (L.set === this.labelSet || L.set === "all") && !(L.probe && L.probe.userData.alpha <= 0.3); }
    // move each hidden pointer to the clear spot on its part that is nearest to where it was
    anchors() {
      const solid = this.#solid(), v = new T.Vector3(), c = new T.Vector3(); let moved = 0;
      this.root.updateMatrixWorld(true);
      for (const L of this.labelList) {
        if (!L.auto || !L.obj) continue;
        // the part it points at is ghosted away: point at another part of the same key that is still there
        if (!L.scope && L.probe && L.probe.userData.alphaTo <= 0.3) {
          const m = this.parts.find((q) => q.isMesh && q.userData.alphaTo > 0.3 && this.infoOf(q) === L.key);
          if (m) { m.geometry.computeBoundingBox(); L.probe = L.obj = m; L.local = m.geometry.boundingBox.getCenter(new T.Vector3()); }
        }
        if (!this.#labelOn(L)) continue;
        L.obj.localToWorld(v.copy(L.local));
        if (!this.#blocker(L.key, v, solid)) continue;
        const from = v.clone().project(this.camera), meshes = [];
        if (L.scope) L.scope.traverse((m) => m.isMesh && meshes.push(m)); else for (const m of this.parts) if (m.isMesh && this.infoOf(m) === L.key) meshes.push(m);
        let best = null, bd = Infinity;
        for (const m of meshes) {
          if (!m.visible || m.userData.alpha <= 0.3) continue;
          const pos = m.geometry.attributes.position, step = Math.max(1, Math.ceil(pos.count / 24));
          for (let i = 0; i < pos.count; i += step) {
            m.localToWorld(c.fromBufferAttribute(pos, i));
            const q = c.clone().project(this.camera), d = (q.x - from.x) ** 2 + (q.y - from.y) ** 2;
            if (d < bd && Math.abs(q.x) < 0.98 && Math.abs(q.y) < 0.98 && !this.#blocker(L.key, c, solid)) { bd = d; best = { m, p: c.clone() }; }
          }
        }
        if (best) { L.obj = best.m; L.local = best.m.worldToLocal(best.p); moved++; }
      }
      return moved;
    }
    #teach(dt) {
      if (this.labelSet && (this.anchorT = (this.anchorT || 0) + dt) > 0.4) { this.anchorT = 0; this.anchors(); }
      // highlight the selected parts: a blue tint and glow that breathes slowly, plus a blue outline
      const sel = this.selected, k = this.reduced ? 0.42 : 0.42 + 0.14 * Math.sin(this.time * 3.2);
      for (const p of this.parts) { if (!p.isMesh) continue; const u = p.userData; if (u.ik === undefined) u.ik = this.infoOf(p); const on = !!sel && u.ik === sel; if (on) p.material.emissive.setHex(HILITE).multiplyScalar(k); else if (u.hl) p.material.emissive.setHex(0); if (on !== !!u.hl) { u.hl = on; this.#edgeLook(p); if (!u.led) { if (on) { u.c0 = p.material.color.getHex(); p.material.color.lerp(new T.Color(HILITE), 0.85); } else if (u.c0 !== undefined) p.material.color.setHex(u.c0); } } }
      // flows
      for (const f of this.flowList) { const on = this.flowSet && (f.set === this.flowSet || f.set === "all"); f.t = ((f.t || 0) + dt * f.speed * f.rate) % 1; f.dots.forEach((d, i) => { d.visible = !!on; if (on) d.position.copy(f.curve.getPointAt((f.t + i / f.dots.length) % 1)); }); }
      // labels: two columns with leader lines, or pinned at the part
      const W = this.stage.clientWidth, H = this.canvas.clientHeight, v = new T.Vector3(), cols = [[], []]; let svg = "";
      for (const L of this.labelList) {
        const on = this.labelSet && (L.set === this.labelSet || L.set === "all") && (!L.probe || (L.probe.visible && L.probe.userData.alpha > 0.3));
        L.el.hidden = !on; if (!on) continue;
        if (L.obj) L.obj.localToWorld(v.copy(L.local)); else v.copy(L.world);
        v.project(this.camera); L.x = (v.x + 1) / 2 * W; L.y = (1 - v.y) / 2 * H;
        if (L.pin) { L.el.style.left = L.x + "px"; L.el.style.top = L.y + "px"; } else cols[L.x < W / 2 ? 0 : 1].push(L);
      }
      cols.forEach((col, side) => {
        col.sort((a, b) => a.y - b.y); let y = 14;
        for (const L of col) { L.ly = Math.max(y, Math.min(H - 14, L.y)); y = L.ly + 26; }
        for (let k = col.length - 1, lim = H - 14; k >= 0; k--) { col[k].ly = Math.min(col[k].ly, lim); lim = col[k].ly - 26; }
        for (const L of col) {
          if (!L.w) L.w = L.el.offsetWidth;
          L.el.style.top = L.ly + "px"; L.el.style.left = (side ? W - 8 - L.w : 8) + "px";
          const ex = side ? W - 12 - L.w : 12 + L.w;
          svg += `<path d="M${ex} ${L.ly}L${ex + (side ? -14 : 14)} ${L.ly}L${L.x.toFixed(1)} ${L.y.toFixed(1)}"/><circle cx="${L.x.toFixed(1)}" cy="${L.y.toFixed(1)}" r="2.2"/>`;
        }
      });
      if (svg !== this.lastSvg) { this.leaders.innerHTML = svg; this.lastSvg = svg; }
    }
    touch() { this.lastInput = performance.now(); }
    // tour(step): when nobody touches the figure for `idle` seconds, call step() every `every` seconds.
    tour(step, { idle = 14, every = 7 } = {}) { this.tourCfg = { step, idle: idle * 1000, every: every * 1000, next: 0 }; }
    dispose() { this.dead = true; if (this.frame) cancelAnimationFrame(this.frame); this.renderer.dispose(); }
    // audit(): counts, plus parts that touch nothing (a part must sit on another part).
    audit() {
      const ms = []; this.root.updateMatrixWorld(true); this.root.traverse((o) => { if (o.isMesh && o.visible) ms.push(o); });
      let tris = 0; const tags = {};
      const boxes = ms.map((m) => { const g = m.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; const t = m.userData.tag || "untagged"; tags[t] = (tags[t] || 0) + 1; g.computeBoundingBox(); return g.boundingBox.clone().applyMatrix4(m.matrixWorld).expandByScalar(0.6); });
      const floating = [];
      boxes.forEach((b, i) => { if (["flow", "packet"].includes(ms[i].userData.tag)) return; if (!boxes.some((c, j) => j !== i && b.intersectsBox(c))) { const c = b.getCenter(new T.Vector3()); floating.push((ms[i].userData.tag || "untagged") + " at " + [c.x, c.y, c.z].map((v) => Math.round(v)).join(",")); } });
      // size of each tag, so a wrong unit or a part that lies the wrong way shows up as a number
      const ext = {}; ms.forEach((m, i) => { const t = m.userData.tag || "untagged"; (ext[t] = ext[t] || new T.Box3()).union(boxes[i]); });
      const extents = {}; for (const t in ext) { const z = ext[t].getSize(new T.Vector3()); extents[t] = [z.x, z.y, z.z].map((v) => Math.round(v)); }
      // labels of the active set whose part is behind something else
      this.anchors();
      const hiddenLabels = [], v = new T.Vector3(), solid = this.#solid();
      for (const L of this.labelList) {
        if (!this.#labelOn(L)) continue;
        if (L.obj) L.obj.localToWorld(v.copy(L.local)); else v.copy(L.world);
        const hit = this.#blocker(L.key, v, solid);
        if (hit) hiddenLabels.push(L.el.textContent + " (behind " + (this.infoOf(hit) || hit.userData.tag || "a part") + ")");
      }
      const F = this.factList || [], ids = new Set(F.map((f) => f.id));
      const facts = { total: F.length, sourced: F.filter((f) => f.status === "sourced").length, noSource: F.filter((f) => f.status === "sourced" && !f.url).map((f) => f.id), unlinked: Object.keys(this.infoDict).filter((k) => { const d = this.infoDict[k], l = [].concat(d.src || []); return (d.fact && !l.length) || l.some((i) => !ids.has(i)); }), general: Object.keys(this.infoDict).filter((k) => ![].concat(this.infoDict[k].src || []).length) };
      return { parts: ms.length, triangles: Math.round(tris), tags, extents, floating, hiddenLabels, failedChecks: (this.checks || []).filter((c) => !c.ok).map((c) => c.name + (c.detail ? ": " + c.detail : "")), checks: (this.checks || []).length, facts };
    }
    readout(text) { if (this.readoutEl.textContent !== text) this.readoutEl.textContent = text; }

    run() { if (!this.frame && this.visible && !this.dead) { this.last = 0; this.frame = requestAnimationFrame((t) => this.#tick(t)); } }
    #tick(now) {
      if (this.dead) return;
      const dt = this.last ? Math.min((now - this.last) / 1000, 1 / 30) : 1 / 60;
      const tc = this.tourCfg; if (tc && !this.reduced && !this.inLesson && !this.pickHandler && !this.selected && now - this.lastInput > tc.idle && now > tc.next) { tc.next = now + tc.every; tc.step(); }
      this.last = now; this.time += dt;
      if (!this.fitted) this.fit(true);
      const ease = (tau) => (this.reduced || this.snap ? 1 : 1 - Math.exp(-dt / tau));
      for (const k in this.channels) { const c = this.channels[k]; c.v += (c.to - c.v) * ease(c.tau); if (Math.abs(c.to - c.v) < 1e-4) c.v = c.to; }
      const v = this.view, w = this.viewTo, kv = ease(0.35);
      v.c.lerp(w.c, kv); v.half += (w.half - v.half) * kv; v.az += (w.az - v.az) * kv; v.el += (w.el - v.el) * kv;
      this.#applyView();
      for (const p of this.parts) {
        const u = p.userData;
        if (u.explode) p.position.copy(u.rest).addScaledVector(u.explode, this.ch(u.channel));
        if (p.isMesh && u.alpha !== u.alphaTo) {
          u.alpha += (u.alphaTo - u.alpha) * ease(0.22); if (Math.abs(u.alphaTo - u.alpha) < 0.004) u.alpha = u.alphaTo;
          const tr = u.alpha < 0.999; if (p.material.transparent !== tr) { p.material.transparent = tr; p.material.needsUpdate = true; }
          p.material.opacity = u.alpha; p.material.depthWrite = u.alpha > 0.95; p.castShadow = u.shadow && u.alpha > 0.6;
          p.visible = u.alpha > 0.004;
          this.#edgeLook(p);
        }
      }
      for (const f of this.updaters) f(dt, this.time);
      this.#teach(dt);
      this.renderer.render(this.scene, this.camera);
      this.frame = this.visible ? requestAnimationFrame((t) => this.#tick(t)) : 0;
    }
  }

  // ---------- card ----------
  function card(mount, { fig = "Fig 1", title = "", keys = [], caption = "" }) {
    const m = typeof mount === "string" ? document.querySelector(mount) : mount;
    const head = document.createElement("div"); head.className = "mech-head";
    const dark = (document.documentElement.dataset.theme || "dark") === "dark";
    head.innerHTML = `<span>${fig}</span><b>${title}</b><button class="mech-theme" aria-label="Switch to ${dark ? "light" : "dark"} theme">${dark ? "Light" : "Dark"}</button>`;
    // The theme button flips data-theme on <html>, remembers the choice for this reader, and tells the scene to rebuild.
    head.querySelector("button").addEventListener("click", () => { const next = dark ? "light" : "dark"; document.documentElement.dataset.theme = next; try { localStorage.setItem("mech-theme", next); } catch (e) {} global.dispatchEvent(new Event("mech-theme")); });
    const k = document.createElement("div"); k.className = "mech-keys"; k.innerHTML = keys.map((x) => `<span class="k-${x.mark}">${x.label}</span>`).join("");
    const c = document.createElement("p"); c.className = "mech-cap"; c.textContent = caption;
    m.prepend(head); m.append(k, c);
    const fig3d = global.mech.current, F = (fig3d && fig3d.factList) || [];
    if (F.length) {
      const b = document.createElement("button"); b.className = "mech-theme"; b.textContent = "Sources"; b.setAttribute("aria-expanded", "false"); head.append(b);
      const box = document.createElement("div"); box.className = "mech-sources"; box.hidden = true;
      const word = { sourced: "from the source", model: "worked out by the model", assumed: "typical value, assumed", illustrative: "made up for illustration" };
      box.innerHTML = "<b>Where the facts come from</b><ul>" + F.map((f) => `<li>${f.claim} <i>${word[f.status] || f.status}</i>${f.url ? ` <a href="${f.url}" target="_blank" rel="noopener">${f.source || "source"}</a>` : f.source ? ` <span>${f.source}</span>` : ""}</li>`).join("") + "</ul>";
      m.append(box); b.addEventListener("click", () => { box.hidden = !box.hidden; b.setAttribute("aria-expanded", String(!box.hidden)); });
    }
  }

  const CSS = `
:root{--m-paper:#121212;--m-ink:#e8e8e8;--m-muted:#8a8a8a;--m-card:#161616;--m-rule:#2a2a2a;--m-lit:#fff;--m-mid:#6a6a6a}
[data-theme=light]{--m-paper:#f7f7f5;--m-ink:#1a1a1a;--m-muted:#6b6b70;--m-card:#fff;--m-rule:#e2e2e0;--m-lit:#000;--m-mid:#9a9a9f}
body{margin:0;background:var(--m-paper);color:var(--m-ink);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif}
.mech{max-width:680px;margin:28px auto;background:var(--m-card);border:1px solid var(--m-rule);border-radius:12px;padding:14px 16px 12px}
.mech-head,.mech-foot{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--m-muted)}
.mech-head b{color:var(--m-ink);font-weight:500;margin-left:auto}
.mech-theme{font:inherit;font-size:11px;color:var(--m-muted);background:transparent;border:1px solid var(--m-rule);border-radius:6px;padding:2px 8px;margin-left:10px;cursor:pointer}
.mech-stage{outline:none;cursor:grab;margin:6px 0;border-radius:8px}
.mech-stage:active{cursor:grabbing}.mech-stage:focus-visible{box-shadow:0 0 0 2px var(--m-muted)}
.mech-stage canvas{display:block;width:100%;height:auto}
.mech-foot code{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--m-ink)}
.mech-keys{display:flex;flex-wrap:wrap;gap:6px 18px;margin:10px 0 4px;font-size:12px;color:var(--m-muted)}
.mech-keys span::before{content:"";display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px;background:var(--m-mid)}
.mech-keys .k-lit::before{background:var(--m-lit)}
.mech-cap{font-size:13px;color:var(--m-muted);margin:6px 0 0}
.mech-controls{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin:2px 0 8px;font-size:12px;color:var(--m-muted)}
.mech-controls button{font:inherit;color:var(--m-ink);background:transparent;border:1px solid var(--m-rule);border-radius:7px;padding:5px 10px;cursor:pointer}
.mech-controls button[aria-pressed=true]{background:var(--m-ink);color:var(--m-card);border-color:var(--m-ink)}
.mech-controls input[type=range]{flex:1;min-width:120px;accent-color:var(--m-ink)}
.mech-controls .sp{flex-basis:100%;height:0}
.mech-stage{position:relative}
.mech-over{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.mech-leaders{position:absolute;inset:0;width:100%;height:100%}
.mech-leaders path{fill:none;stroke:var(--m-muted);stroke-width:1}.mech-leaders circle{fill:var(--m-ink)}
.mech-label{position:absolute;transform:translateY(-50%);font-size:11.5px;line-height:1.2;white-space:nowrap;color:var(--m-ink);background:var(--m-card);border:1px solid var(--m-rule);border-radius:5px;padding:2px 6px}
.mech-label.pin{transform:translate(-50%,-50%);background:transparent;border:0;font-weight:500;text-shadow:0 0 4px var(--m-card),0 0 4px var(--m-card)}
.mech-label.pin.box{background:var(--m-card);border:1px solid var(--m-rule);font-size:12.5px;padding:3px 8px;text-shadow:none}
.mech-panel{margin:0 0 8px;background:var(--m-card);border:1px solid var(--m-rule);border-radius:9px;padding:9px 11px;font-size:12.5px;line-height:1.45;color:var(--m-muted)}
.mech-label.can{pointer-events:auto;cursor:pointer}.mech-label.can:hover{border-color:var(--m-ink)}
.mech-panel .row{margin-top:3px}.mech-panel u{text-decoration:none;color:var(--m-ink);font-weight:600;margin-right:6px}
.mech-panel small{display:block;margin-top:6px;font-size:11px}.mech-panel small i{font-style:normal;border:1px solid var(--m-rule);border-radius:4px;padding:0 5px;margin-right:5px;color:var(--m-ink)}
.mech-panel b{display:block;color:var(--m-ink);font-weight:600;font-size:13px;margin-bottom:2px}.mech-panel span{display:block}.mech-panel em{display:block;font-style:normal;color:var(--m-ink);margin-top:4px}
.mech-lesson{border:1px solid var(--m-rule);border-radius:9px;padding:9px 11px;margin:0 0 8px;font-size:13px}
.mech-lesson .row{display:flex;align-items:center;gap:8px}.mech-lesson b{font-weight:600}.mech-lesson .n{color:var(--m-muted);font-size:12px;margin-right:auto}
.mech-lesson button{font:inherit;font-size:12px;color:var(--m-ink);background:transparent;border:1px solid var(--m-rule);border-radius:7px;padding:4px 10px;cursor:pointer}
.mech-lesson p{margin:6px 0 0;color:var(--m-muted)}
.mech-sources{border-top:1px solid var(--m-rule);margin-top:10px;padding-top:8px;font-size:12px;color:var(--m-muted)}
.mech-sources b{color:var(--m-ink);font-weight:600}.mech-sources ul{margin:6px 0 0;padding-left:18px}.mech-sources li{margin:3px 0}
.mech-sources i{font-style:normal;border:1px solid var(--m-rule);border-radius:4px;padding:0 5px;font-size:11px;margin:0 4px}.mech-sources a{color:var(--m-ink)}`;

  try { const t = localStorage.getItem("mech-theme"); if (t === "light" || t === "dark") document.documentElement.dataset.theme = t; } catch (e) {}
  global.mech = { VERSION, Figure, card, CSS, THEMES, MATS, boxGeo, cylGeo, tubeGeo, profileGeo, latheGeo, torusGeo, voluteGeo, superSection, sweep, loftGeo, plateGeo, gearGeo, pitchRadius, wrapPath, hop, roundedRect };
})(window);
