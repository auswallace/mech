/* Structure of an office tower. A generic building, not a real one. Units: metres. z up, ground at z = 0.
   The sizes are typical values chosen for the model: 20 storeys of 4 m, an 8 m column grid,
   a concrete core for the lifts, a steel frame, and a mat foundation on 24 piles. */
(function () {
  const THEME = document.documentElement.dataset.theme || "dark";
  // ---------- the model ----------
  const M = { storeys: 20, h: 4, xs: [-20, -12, -4, 4, 12, 20], ys: [-12, -4, 4, 12], core: 8, pileLen: 16 };
  M.height = M.storeys * M.h;
  M.inCore = (x, y) => Math.abs(x) <= M.core / 2 && Math.abs(y) <= M.core / 2;
  M.grid = M.xs.flatMap((x) => M.ys.map((y) => [x, y]));
  M.columns = M.grid.filter(([x, y]) => !M.inCore(x, y));
  const state = { stage: 0, built: M.storeys, labels: true, flow: null, style: location.hash === "#line" ? "line" : "real" };
  let F = null;

  function start() {
    if (F) F.dispose();
    F = new mech.Figure("#fig", { theme: THEME, style: state.style, width: 760, height: 560, azimuth: 36, elevation: 20 });
    const REAL = state.style === "real", AMBER = 0xff8a2a, BLUE = 0x4aa8ff;

    // ---------- below ground ----------
    const soil = F.box({ w: 72, d: 56, h: 19.5 }, { color: 0x6b5a48, at: [0, 0, -19.8], tag: "soil", edges: 40, shadow: false });
    const firm = F.box({ w: 72, d: 56, h: 4 }, { color: 0x3f372f, at: [0, 0, -23.8], tag: "soil", info: "firm", shadow: false });
    F.box({ w: 44, d: 28, h: 2, r: 0.4 }, { mat: "concrete", at: [0, 0, -2.3], tag: "found", info: "mat" });
    F.box({ w: 44, d: 28, h: 0.3 }, { mat: "concrete", at: [0, 0, -0.3], tag: "found", info: "slab" });
    const piles = M.grid.map(([x, y]) => F.cyl({ r: 0.6, h: M.pileLen, n: 12 }, { mat: "concrete", at: [x, y, -2.3 - M.pileLen], tag: "found", info: "pile" }));

    // ---------- storeys ----------
    const st = [];
    for (let k = 0; k < M.storeys; k++) {
      const z = k * M.h, S = { slab: [], beam: [], col: [], core: [], facade: [] };
      S.slab.push(F.plate({ w: 40.6, d: 24.6, h: 0.3, holes: [{ x: 0, y: 0, w: 7.2, d: 7.2 }] }, { mat: "concrete", at: [0, 0, z + M.h - 0.3], tag: "slab", info: "slab" }));
      for (const y of M.ys) S.beam.push(F.box({ w: 40, d: 0.35, h: 0.6 }, { mat: "steel", at: [0, y, z + M.h - 0.9], tag: "beam", info: "beam", edges: false }));
      for (const x of M.xs) S.beam.push(F.box({ w: 0.35, d: 24, h: 0.6 }, { mat: "steel", at: [x, 0, z + M.h - 0.9], tag: "beam", info: "beam", edges: false }));
      for (const [x, y] of M.columns) S.col.push(F.box({ w: 0.6, d: 0.6, h: M.h - 0.9 }, { mat: "darkSteel", at: [x, y, z], tag: "col", info: "column", edges: false }));
      S.core.push(F.plate({ w: M.core, d: M.core, h: M.h, holes: [{ x: 0, y: 0, w: 7.2, d: 7.2 }] }, { mat: "concrete", at: [0, 0, z], tag: "core", info: "core" }));
      for (const s of [-1, 1]) {
        S.facade.push(F.box({ w: 40.9, d: 0.15, h: M.h }, { mat: "glass", color: 0x1d3b57, at: [0, s * 12.4, z], tag: "facade", info: "facade", edges: false }));
        S.facade.push(F.box({ w: 0.15, d: 24.9, h: M.h }, { mat: "glass", color: 0x1d3b57, at: [s * 20.4, 0, z], tag: "facade", info: "facade", edges: false }));
        S.facade.push(F.box({ w: 41.1, d: 0.25, h: 0.5 }, { mat: "castAl", at: [0, s * 12.45, z + M.h - 0.5], tag: "facade", info: "facade", edges: false, shadow: false }));
        S.facade.push(F.box({ w: 0.25, d: 25.1, h: 0.5 }, { mat: "castAl", at: [s * 20.45, 0, z + M.h - 0.5], tag: "facade", info: "facade", edges: false, shadow: false }));
        for (const x of [-16, -8, 0, 8, 16]) S.facade.push(F.box({ w: 0.18, d: 0.22, h: M.h - 0.5 }, { mat: "castAl", at: [x, s * 12.45, z], tag: "facade", info: "facade", edges: false, shadow: false }));
        for (const y of [-8, 0, 8]) S.facade.push(F.box({ w: 0.22, d: 0.18, h: M.h - 0.5 }, { mat: "castAl", at: [s * 20.45, y, z], tag: "facade", info: "facade", edges: false, shadow: false }));
      }
      st.push(S);
    }
    // roof
    const roof = [
      F.plate({ w: 40.9, d: 24.9, h: 1, holes: [{ x: 0, y: 0, w: 40.2, d: 24.2 }] }, { mat: "concrete", at: [0, 0, M.height], tag: "roof", info: "plant" }),
      F.box({ w: 9, d: 9, h: 3.4, r: 0.3 }, { mat: "castAl", at: [0, 0, M.height], tag: "roof", info: "plant" }),
      F.box({ w: 8, d: 5, h: 2.4, r: 0.3 }, { mat: "castAl", at: [-12, 5, M.height], tag: "roof", info: "plant" }),
      F.box({ w: 6, d: 6, h: 2, r: 0.3 }, { mat: "castAl", at: [12, -4, M.height], tag: "roof", info: "plant" }),
    ];
    for (let i = 0; i < 6; i++) roof.push(F.cyl({ r: 0.9, h: 0.5, n: 16 }, { mat: "darkSteel", at: [-14.5 + (i % 3) * 2.4, 3.8 + Math.floor(i / 3) * 2.4, M.height + 2.4], tag: "roof", info: "plant", edges: false }));
    // lifts and risers in the core
    const cars = [-1.7, 1.7].map((x) => F.box({ w: 2.6, d: 3, h: 2.8, r: 0.2 }, { mat: "machined", at: [x, -1.4, 0], tag: "lift", info: "lift" }));
    const risers = [F.cyl({ r: 0.3, h: M.height, n: 10 }, { color: BLUE, at: [-2.6, 2.6, 0], tag: "lift", info: "riser", edges: false }), F.cyl({ r: 0.45, h: M.height, n: 10 }, { mat: "castAl", at: [2.4, 2.6, 0], tag: "lift", info: "riser", edges: false })];

    // ---------- flows: where the forces go ----------
    for (const [x, y] of [[-20, -12], [-4, -12], [12, -12], [20, 4]]) F.flow([[x, y, M.height], [x, y, 0], [x, y, -2.3 - M.pileLen]], { color: AMBER, count: 12, speed: 0.12, r: 0.55, set: "gravity" });
    F.flow([[-16, -8, 40.3], [-16, -11, 39.5], [-19, -12, 39.4], [-20, -12, 36], [-20, -12, 20]], { color: AMBER, count: 6, speed: 0.35, r: 0.5, set: "floor" });
    F.flow([[-8, -9, 40.3], [-8, -11.4, 39.5], [-5, -12, 39.4], [-4, -12, 36], [-4, -12, 20]], { color: AMBER, count: 6, speed: 0.35, r: 0.5, set: "floor" });
    for (const z of [70, 52, 34, 16]) F.flow([[-42, -3, z], [-21, -3, z], [-4.2, -3, z]], { color: BLUE, count: 6, speed: 0.3, r: 0.55, set: "wind" });
    F.flow([[-3.8, -3.8, 76], [-3.8, -3.8, 0], [-3.8, -3.8, -3]], { color: BLUE, count: 10, speed: 0.15, r: 0.6, set: "wind" });

    // ---------- what each part is ----------
    F.describe({
      slab: { name: "Floor slab", role: "The floor that people and furniture stand on. It spreads their weight to the beams below it.", fact: M.storeys + " floors, each " + M.h + " m above the last." },
      beam: { name: "Beam", role: "Carries the slab and passes the load sideways to the columns." },
      column: { name: "Column", role: "Carries the beams down. Each column also carries every column above it, so the load grows toward the ground.", fact: M.columns.length + " columns on an 8 m grid." },
      core: { name: "Concrete core", role: "A stiff concrete tube around the lifts. It stops the tower from swaying in wind, and it holds the lifts, stairs and pipes." },
      lift: { name: "Lift car", role: "Moves people up and down inside the core." },
      riser: { name: "Services riser", role: "Vertical pipes and ducts that take water, air and power to every floor." },
      facade: { name: "Facade", role: "The glass skin. It keeps the weather out and hangs from the floor edges. It does not hold the building up." },
      plant: { name: "Roof plant", role: "Machines on the roof: the lift motors, cooling units and fans." },
      mat: { name: "Mat foundation", role: "A thick concrete slab under the whole tower. It ties the column bases together and spreads their load across the piles." },
      pile: { name: "Pile", role: "A concrete shaft in the ground. It carries the load through soft soil down to firm ground.", fact: M.grid.length + " piles, each " + M.pileLen + " m long." },
      firm: { name: "Firm ground", role: "Dense soil or rock that can carry the weight of the tower." },
    });
    const mid = st[10];
    F.label("facade", { set: "tower", on: st[14].facade[0] }); F.label("plant", { set: "tower", on: roof[1] });
    F.label("slab", { set: "open", on: st[15].slab[0] }); F.label("column", { set: "open", on: st[8].col[0] }); F.label("core", { set: "open", on: st[12].core[0] }); F.label("plant", { set: "open", on: roof[1] });
    F.label("beam", { set: "frame", on: mid.beam[0] }); F.label("column", { set: "frame", on: st[6].col[0] }); F.label("core", { set: "frame", on: st[14].core[0] });
    F.label("core", { set: "core", on: st[15].core[0] }); F.label("lift", { set: "core", on: cars[0] }); F.label("riser", { set: "core", on: [-2.6, 2.6, 30] });
    F.label("mat", { set: "found" }); F.label("pile", { set: "found", on: piles[0] }); F.label("firm", { set: "found" }); F.label("column", { set: "found", on: st[0].col[0] });

    // ---------- running ----------
    const tri = (t) => { const u = t % 2; return u < 1 ? u : 2 - u; };
    F.onFrame((dt, t) => {
      const top = Math.max(1, state.built) - 1;
      const f = [tri(t * 0.045), tri(t * 0.06 + 0.7)].map((u) => Math.round(Math.min(1, Math.max(0, u * 1.2 - 0.1)) * top * 20) / 20);
      cars.forEach((c, i) => (c.position.z = f[i] * M.h + 0.35));
      F.readout(state.built + " of " + M.storeys + " storeys · " + state.built * M.h + " m · lifts at floors " + Math.round(f[0]) + " and " + Math.round(f[1]));
    });

    // ---------- stages ----------
    const box = (a, b) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b));
    const above = box([-22, -14, 0], [22, 14, 86]);
    const STAGES = [
      { name: "Tower", set: "tower", a: { slab: 1, beam: 1, col: 1, core: 1, facade: 1, roof: 1, lift: 1, soil: 0, found: 0 }, hint: "A 20-storey office tower. The glass is only a skin.", view: [above, 36, 20, 1.05] },
      { name: "See-through", set: "open", a: { slab: 1, beam: 1, col: 1, core: 1, facade: 0.06, roof: 1, lift: 1, soil: 0, found: 0 }, hint: "Behind the glass: floors on beams, beams on columns, and a concrete core in the middle.", view: [above, 36, 20, 1.05] },
      { name: "Frame", set: "frame", a: { slab: 0.07, beam: 1, col: 1, core: 1, facade: 0, roof: 0.1, lift: 1, soil: 0, found: 0 }, hint: "The skeleton. Columns and beams carry weight. The core resists wind.", view: [above, 30, 16, 1.05] },
      { name: "Core and lifts", set: "core", a: { slab: 0.04, beam: 0.05, col: 0.08, core: 0.22, facade: 0, roof: 0.1, lift: 1, soil: 0, found: 0 }, hint: "The core is a hollow concrete tube. The lifts and service pipes run inside it.", view: [box([-10, -8, 0], [10, 8, 86]), 30, 16, 1.02] },
      { name: "Foundation", set: "found", a: { slab: 1, beam: 1, col: 1, core: 1, facade: 0.06, roof: 1, lift: 1, soil: 0.13, found: 1 }, hint: "Under the ground: a concrete mat on piles that reach firm ground.", view: [box([-30, -22, -24], [30, 22, 16]), 34, 14, 1.0] },
    ];
    function apply() {
      const A = STAGES[state.stage].a;
      st.forEach((S, k) => { const m = k < state.built ? 1 : 0; for (const key of ["slab", "beam", "col", "core", "facade"]) F.ghost(S[key], A[key] * m); });
      risers.forEach((r) => (r.scale.z = state.built / M.storeys)); F.ghost(roof, state.built === M.storeys ? A.roof : 0); F.ghost("lift", A.lift); F.ghost(soil, A.soil); F.ghost(firm, A.soil ? 0.6 : 0); F.ghost("found", A.found);
      F.shadow(A.soil ? 0 : 1);
    }

    // ---------- controls ----------
    const bar = document.createElement("div"); bar.className = "mech-controls";
    bar.innerHTML = STAGES.map((s, i) => `<button data-stage="${i}">${i + 1} ${s.name}</button>`).join("") +
      `<span class="sp"></span><span>Build</span><input type="range" min="1" max="${M.storeys}" step="1" value="${state.built}" aria-label="Number of storeys built"><span class="sp"></span><button data-t="labels" aria-pressed="${state.labels}">Labels</button><button data-t="gravity">Weight path</button><button data-t="wind">Wind path</button><button data-t="lesson">Lesson: how the weight gets down</button><button data-t="quiz">Quiz</button><button data-t="style">${REAL ? "Line view" : "Real view"}</button>`;
    F.mount.querySelector(".mech-stage").after(bar);
    const hintEl = F.mount.querySelector(".mech-hint"), slider = bar.querySelector("input");
    const flowBtn = () => bar.querySelectorAll("[data-t=gravity],[data-t=wind]").forEach((b) => b.setAttribute("aria-pressed", state.flow === b.dataset.t));
    function setStage(i, quiet, keep) { if (!quiet) F.touch(); state.stage = ((i % STAGES.length) + STAGES.length) % STAGES.length; const S = STAGES[state.stage]; apply(); if (!keep) { state.flow = null; } F.flows(state.flow); flowBtn(); F.labels(state.labels ? S.set : null); F.focus(S.view[0], { azimuth: S.view[1], elevation: S.view[2], pad: S.view[3] }); hintEl.textContent = S.hint; bar.querySelectorAll("[data-stage]").forEach((b, k) => b.setAttribute("aria-pressed", k === state.stage)); }
    const show = (stage, flow, set) => () => { state.flow = flow; setStage(stage, true, true); if (set) F.labels(set); };
    const lesson = F.lesson([
      { title: "1. The load starts on the floor", text: "People, desks and the slab's own weight press down on each floor slab.", go: show(1, null) },
      { title: "2. Slab to beam to column", text: "The slab rests on beams. Each beam passes its share sideways to the columns at its ends.", go: () => { show(2, "floor", "frame")(); F.focus(box([-22, -14, 30], [0, 0, 44]), { azimuth: 30, elevation: 24, pad: 1.0 }); } },
      { title: "3. Columns stack the load", text: "Each column carries its own floor and every floor above it. The columns at the bottom carry the most.", go: show(2, "gravity") },
      { title: "4. The core takes the wind", text: "Wind pushes on the glass. The floors pass that push to the core, and the core carries it down like a mast.", go: show(3, "wind") },
      { title: "5. Into the ground", text: "The mat spreads the column loads across the piles. The piles carry them through soft soil to firm ground.", go: show(4, "gravity") },
    ], { onClose: () => setStage(0, true) });
    const quiz = F.quiz([
      { ask: "Click a part that carries weight straight down, floor after floor.", key: "column", also: ["pile"] },
      { ask: "Click the part that stops the tower from swaying.", key: "core" },
      { ask: "Click a part that passes floor loads sideways to the columns.", key: "beam" },
      { ask: "Click the part that carries the tower's weight down to firm ground.", key: "pile" },
    ]);
    bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F.touch(); const t = b.dataset.t;
      if (b.dataset.stage) setStage(+b.dataset.stage); else if (t === "style") { state.style = REAL ? "line" : "real"; start(); } else if (t === "labels") { state.labels = !state.labels; b.setAttribute("aria-pressed", state.labels); setStage(state.stage, true, true); }
      else if (t === "gravity" || t === "wind") { state.flow = state.flow === t ? null : t; setStage(state.flow === "wind" ? 3 : state.flow ? 2 : state.stage, true, true); }
      else if (t === "lesson") lesson.open(0); else if (t === "quiz") { setStage(4); quiz.start(); } });
    slider.addEventListener("input", () => { F.touch(); state.built = +slider.value; apply(); });
    F.stage.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= "5") setStage(+e.key - 1); });
    F.onPress = () => setStage(state.stage + 1);
    F.tour(() => setStage(state.stage + 1, true));

    mech.card("#fig", {
      fig: "Fig 3", title: "Structure of an office tower",
      keys: [{ mark: "lit", label: "Click a part to learn what it does" }, { mark: "mid", label: "Keys 1 to 5 change the view. The Build slider adds storeys. Drag to orbit." }],
      caption: "A generic steel-frame tower with a concrete core, not a real building. The sizes are typical values chosen for the model: " + M.storeys + " storeys of " + M.h + " m, columns on an 8 m grid, and a mat foundation on " + M.grid.length + " piles. Orange dots show the path of weight. Blue dots show the path of wind load. The dots show direction only, not the size of the force.",
    });
    window.fig = F; window.setStage = setStage; window.state = state;
    setStage(state.stage, true); F.fit(true);
  }
  start();
})();
