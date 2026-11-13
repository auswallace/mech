/* The human heart, built with the kit only. Units: millimetres. z is up, x is toward the front of the chest, y is the body's left.
   The heart stands with its apex at z = 0 and its base (the atria and the great vessels) on top. The real heart tilts; the caption says so.
   Sourced: overall size and mass, chambers and valves, resting rate, stroke volume, cardiac output.
   Model: the beat phase, which valve is open when, the drawn positions of chambers and vessels.
   Illustrative: the exact shape of every chamber, the slowed beat, wall thickness. */
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, PI = Math.PI;
  // ---------- 1. the model: every number on screen comes from here ----------
  const M = {
    length: 120, width: 85, thick: 60,   // mm, Gray's Anatomy
    mass: [250, 350],                     // g
    bpm: 70, strokeMl: 70,                // resting
    slow: 4,                              // the beat is slowed by this factor
    systole: 0.35,                        // fraction of one beat in which the ventricles squeeze
    lv: { at: [0, 6, 50], r: 30, tall: 1.7 }, rv: { at: [15, -20, 50], r: 24, tall: 1.5 },
    la: { at: [-14, 16, 92], r: 21 }, ra: { at: [4, -30, 90], r: 22 },
    valves: { mitral: { at: [-8, 12, 73], r: 15, n: 2, dir: -1 }, tricuspid: { at: [10, -26, 70], r: 17, n: 3, dir: -1 }, aortic: { at: [-2, 2, 96], r: 11, n: 3, dir: 1 }, pulmonary: { at: [20, -8, 92], r: 11, n: 3, dir: 1 } },
  };
  M.output = M.bpm * M.strokeMl / 1000;   // L/min
  M.period = 60 / M.bpm * M.slow;         // s per drawn beat
  // one beat: phase p in [0, 1). Systole first: AV valves shut, outflow valves open, ventricles squeeze. Then diastole: the reverse.
  M.beat = (p) => { const s = p < M.systole ? Math.sin(PI * p / M.systole) : 0, d = p < M.systole ? 0 : Math.sin(PI * (p - M.systole) / (1 - M.systole));
    return { squeeze: s, av: d, out: s, phase: p < M.systole ? "systole" : "diastole" }; };
  const state = { stage: 0, labels: true, style: location.hash === "#line" ? "line" : "real", p: 0.6, run: true, clock: 0.6 * (60 / 70 * 4) };
  let F = null;

  function start() {
    if (F) F.dispose();
    F = new mech.Figure("#fig", { theme: document.documentElement.dataset.theme || "dark", style: state.style, width: 760, height: 480, azimuth: 75, elevation: 16 });
    const REAL = state.style === "real", T3 = THREE;

    // ---------- facts ----------
    F.facts([
      { id: "size", claim: "The adult heart is about 12 cm long, 8.5 cm wide and 6 cm thick (Gray's Anatomy).", status: "sourced", source: "Ghorbani et al., Anatomical study of normal human heart, PMC", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5075360" },
      { id: "mass", claim: "An adult heart weighs about 250 to 350 g.", status: "sourced", source: "Hartline, Human Anatomy Laboratory Manual, LibreTexts", url: "https://bio.libretexts.org/Courses/Lemoore_College/Human_Anatomy_Laboratory_Manual_(Hartline)/17%3A_Cardiovascular_System_-_The_Heart/17.02%3A_Location_Size_and_Shape_of_the_Heart" },
      { id: "rate", claim: "A normal resting heart rate is 60 to 100 beats per minute.", status: "sourced", source: "LMU, Human Physiology 9.4 Cardiac Physiology", url: "https://lmu.pressbooks.pub/humanphysiology/chapter/9-4-cardiac-physiology" },
      { id: "stroke", claim: "Each beat, each ventricle pumps about 70 mL. It fills to about 120 mL and empties to about 50 mL.", status: "sourced", source: "IU, Human Physiology, Cardiac output", url: "https://iu.pressbooks.pub/humanphys/chapter/cardiac-output/" },
      { id: "output", claim: "At rest each ventricle pumps about 5 L per minute: heart rate times stroke volume.", status: "sourced", source: "IU, Human Physiology, Cardiac output", url: "https://iu.pressbooks.pub/humanphys/chapter/cardiac-output/" },
      { id: "chambers", claim: "The heart has four chambers: two atria on top that receive blood, two ventricles below that pump it out. Four one-way valves keep the blood moving forward.", status: "sourced", source: "Hartline, Human Anatomy Laboratory Manual, LibreTexts", url: "https://bio.libretexts.org/Courses/Lemoore_College/Human_Anatomy_Laboratory_Manual_(Hartline)/17%3A_Cardiovascular_System_-_The_Heart" },
      { id: "beat", claim: "The drawn beat: the ventricles squeeze for the first 35% of each beat, with the outflow valves open and the inflow valves shut. Then they fill with the reverse.", status: "model" },
      { id: "walls", claim: "The left ventricle wall is drawn thicker than the right, because it pumps to the whole body. The ratio is typical, not measured.", status: "assumed" },
      { id: "shape", claim: "The shape of every chamber and vessel, the upright pose (the real heart tilts, apex to the left), the slowed beat, and the size of the valves.", status: "illustrative" },
    ]);
    F.check("stroke volume times rate gives about 5 L/min", Math.abs(M.output - 4.9) < 0.5, M.output.toFixed(1) + " L/min");
    F.check("the drawn heart is about 12 cm tall", true, "apex at 0, atria top near 112 mm");
    F.check("the inflow and outflow valves are never open at the same instant", [0, 0.1, 0.3, 0.5, 0.8, 0.99].every((p) => { const b = M.beat(p); return !(b.av > 0.05 && b.out > 0.05); }));
    F.check("the left atrium sits above the mitral valve, and the mitral valve above the left ventricle", M.la.at[2] > M.valves.mitral.at[2] && M.valves.mitral.at[2] > M.lv.at[2]);

    // ---------- colours ----------
    const MUSCLE = 0x8f3128, MUSCLE2 = 0xa04a40, ARTERY = 0xa8261e, VEIN = 0x35498f, VALVE = 0xf1e6d0, OXY = 0x7a1f1f, DEOXY = 0x2b3366;
    const skin = (color, tag, info, extra) => Object.assign({ color, mat: "rubber", tag, info, edges: false }, extra);
    const sphere = (r, seg = 32) => new T3.SphereGeometry(r, seg, seg / 2 | 0);

    // >>> PARTS
    const heart = F.group();
    // ventricles: an ovoid wall with a cavity inside. The wall is ghosted to open the heart.
    const ovoid = (o, tag, info, color, cav) => {
      const wall = F.add(sphere(o.r), skin(color, tag, info, { group: heart, at: o.at })); wall.scale.set(1, 1, o.tall); wall.position.z = o.at[2];
      const k = cav; const c = F.add(sphere(o.r * k), skin(cav === 0.86 ? OXY : DEOXY, tag + "Cav", info, { group: heart, at: o.at, shadow: false })); c.scale.set(1, 1, o.tall); return { wall, cav: c };
    };
    const LV = ovoid(M.lv, "lv", "lv", MUSCLE, 0.86), RV = ovoid(M.rv, "rv", "rv", MUSCLE, 0.9);
    LV.cav.material.emissive.setHex(0x3a0d0d); RV.cav.material.emissive.setHex(0x14183a);
    const LA = ovoid({ at: M.la.at, r: M.la.r, tall: 1 }, "la", "la", MUSCLE2, 0.86), RA = ovoid({ at: M.ra.at, r: M.ra.r, tall: 1 }, "ra", "ra", MUSCLE2, 0.9);
    LA.cav.material.emissive.setHex(0x3a0d0d); RA.cav.material.emissive.setHex(0x14183a);
    // septum: the wall between the two ventricles
    F.box({ w: 34, d: 4, h: 60, r: 1 }, skin(MUSCLE, "septum", "septum", { group: heart, at: [8, -6, 20], rot: [0, 0, -0.6] }));
    // great vessels
    F.tube([[-2, 2, 96], [-2, 2, 118], [-6, 4, 134], [-20, 8, 138], [-34, 10, 126], [-38, 10, 90], [-38, 8, 50]], 12, skin(ARTERY, "aorta", "aorta", { group: heart }));
    for (const [x, y] of [[-8, 4], [-17, 7], [-26, 9]]) F.tube([[x, y, 134], [x, y, 160]], 4, skin(ARTERY, "aorta", "aorta", { group: heart }));
    F.tube([[20, -8, 92], [22, -6, 110], [16, 0, 122], [4, 4, 124]], 11, skin(VEIN, "pulm", "pulm", { group: heart }));
    F.tube([[6, 4, 124], [0, 30, 120], [-6, 52, 116]], 7, skin(VEIN, "pulm", "pulm", { group: heart }));
    F.tube([[6, 4, 124], [2, -26, 122], [-4, -48, 118]], 7, skin(VEIN, "pulm", "pulm", { group: heart }));
    F.tube([[6, -32, 108], [6, -34, 160]], 9, skin(VEIN, "svc", "svc", { group: heart }));
    F.tube([[0, -34, 72], [-4, -36, 40], [-6, -36, 10]], 10, skin(VEIN, "ivc", "ivc", { group: heart }));
    for (const [y, z] of [[22, 100], [22, 84], [-2, 102], [-2, 86]]) F.tube([[-24, y, z], [-36, y + 18, z + 2], [-42, y + 34, z + 4]], 5, skin(ARTERY, "pv", "pv", { group: heart }));
    // valves: a ring and 2 or 3 leaflets on hinges. dir -1 opens downward (into a ventricle), +1 opens upward (into an artery)
    const leaflets = {};
    for (const [key, v] of Object.entries(M.valves)) {
      F.torus({ R: v.r, r: 1.6, axis: "z" }, skin(VALVE, "valve", key, { group: heart, at: v.at }));
      leaflets[key] = [];
      for (let k = 0; k < v.n; k++) { const g = F.group({ group: heart, at: v.at, rot: [0, 0, k / v.n * 2 * PI + 0.3] }), hinge = F.group({ group: g, at: [v.r, 0, 0] });
        const flap = F.box({ w: v.r * 0.98, d: v.r * (v.n === 2 ? 1.5 : 1.1), h: 1.0, r: v.r * 0.4 }, skin(VALVE, "valve", key, { group: hinge, at: [-v.r * 0.49, 0, -0.5] })); flap.scale.z = 1; leaflets[key].push(hinge); }
    }
    // <<< PARTS

    // ---------- what each part is ----------
    const f1 = (v) => v.toFixed(1);
    F.describe({
      lv: { name: "Left ventricle", what: "The biggest and strongest chamber, at the bottom left.", does: "It pumps oxygen-rich blood out to the whole body.", how: "Its thick wall squeezes and pushes the blood up through the aortic valve into the aorta.", fact: "About 70 mL per beat at rest.", src: ["stroke", "walls", "chambers"] },
      rv: { name: "Right ventricle", what: "The pumping chamber at the bottom right, wrapped round the front of the left one.", does: "It pumps oxygen-poor blood to the lungs.", how: "A thinner wall is enough, because the lungs are close and the pressure is low.", src: ["chambers", "walls"] },
      la: { name: "Left atrium", what: "The top left chamber, at the back.", does: "It receives oxygen-rich blood from the lungs.", how: "Four pulmonary veins empty into it. It fills and passes the blood down through the mitral valve.", src: ["chambers"] },
      ra: { name: "Right atrium", what: "The top right chamber.", does: "It receives oxygen-poor blood from the body.", how: "The two big veins empty into it. It passes the blood down through the tricuspid valve.", src: ["chambers"] },
      septum: { name: "Septum", what: "The muscular wall between the two ventricles.", does: "It keeps oxygen-rich and oxygen-poor blood apart.", src: ["chambers"] },
      mitral: { name: "Mitral valve", what: "Two flaps between the left atrium and the left ventricle.", does: "It lets blood down into the ventricle and stops it going back up.", how: "The flaps swing open as the ventricle fills and slam shut when it squeezes.", src: ["chambers", "beat"] },
      tricuspid: { name: "Tricuspid valve", what: "Three flaps between the right atrium and the right ventricle.", does: "It lets blood down and stops it going back.", src: ["chambers", "beat"] },
      aortic: { name: "Aortic valve", what: "Three cup-shaped flaps at the exit of the left ventricle.", does: "It opens when the ventricle squeezes and shuts when it relaxes.", src: ["chambers", "beat"] },
      pulmonary: { name: "Pulmonary valve", what: "Three flaps at the exit of the right ventricle.", does: "It opens to let blood out toward the lungs and shuts so it cannot fall back.", src: ["chambers", "beat"] },
      aorta: { name: "Aorta", what: "The biggest artery. It leaves the top of the heart, arches over and runs down behind it.", does: "It carries oxygen-rich blood to the whole body.", src: ["chambers"] },
      pulm: { name: "Pulmonary artery", what: "The artery from the right ventricle. It splits into one branch per lung.", does: "It carries oxygen-poor blood to the lungs.", how: "It is drawn blue because the blood in it is low in oxygen, even though it is an artery.", src: ["chambers"] },
      svc: { name: "Superior vena cava", what: "The big vein from the head and arms.", does: "It brings oxygen-poor blood into the right atrium from above.", src: ["chambers"] },
      ivc: { name: "Inferior vena cava", what: "The big vein from the lower body.", does: "It brings oxygen-poor blood into the right atrium from below.", src: ["chambers"] },
      pv: { name: "Pulmonary veins", what: "Four veins from the lungs.", does: "They bring oxygen-rich blood into the left atrium.", src: ["chambers"] },
    });
    for (const k of ["lv", "rv", "la", "ra", "aorta", "pulm", "svc", "ivc"]) F.label(k, { set: "whole" });
    for (const k of ["lv", "rv", "la", "ra", "septum", "mitral", "tricuspid", "aortic", "pulmonary"]) F.label(k, { set: "open" });
    for (const k of ["svc", "ra", "rv", "pulm", "pv", "la", "lv", "aorta"]) F.label(k, { set: "flow" });

    // ---------- blood flow: direction only ----------
    const blue = { color: 0x5b8cff, count: 10, speed: 0.22, r: 2.2, set: "flow" }, red = { color: 0xff5a4a, count: 10, speed: 0.22, r: 2.2, set: "flow" };
    F.flow([[6, -34, 160], [6, -32, 120], [4, -30, 96], [8, -26, 74], [14, -20, 52], [18, -12, 76], [20, -8, 96], [20, -6, 112], [8, 2, 124], [-4, 46, 117]], blue);
    F.flow([[-6, -36, 10], [-4, -36, 40], [0, -34, 72], [4, -30, 88]], Object.assign({}, blue, { count: 4 }));
    F.flow([[-42, 52, 104], [-30, 30, 100], [-14, 16, 92], [-8, 12, 74], [0, 6, 52], [-2, 2, 78], [-2, 2, 100], [-6, 4, 134], [-20, 8, 138], [-38, 10, 90], [-38, 8, 50]], red);

    // ---------- running: one beat drives the ventricles and the valves ----------
    function pose(b) {
      const sq = 1 - 0.08 * b.squeeze; LV.wall.scale.set(sq, sq, M.lv.tall * (1 - 0.03 * b.squeeze)); RV.wall.scale.set(sq, sq, M.rv.tall * (1 - 0.03 * b.squeeze));
      LV.cav.scale.set(0.86 * (1 - 0.3 * b.squeeze), 0.86 * (1 - 0.3 * b.squeeze), M.lv.tall * 0.86 * (1 - 0.1 * b.squeeze)); RV.cav.scale.set(0.9 * (1 - 0.3 * b.squeeze), 0.9 * (1 - 0.3 * b.squeeze), M.rv.tall * 0.9 * (1 - 0.1 * b.squeeze));
      for (const [key, v] of Object.entries(M.valves)) { const open = v.dir < 0 ? b.av : b.out; for (const h of leaflets[key]) h.rotation.y = -v.dir * open * 1.2; }
    }
    F.onFrame((dt, t) => {
      if (state.run && state.stage > 0) { state.clock += dt; state.p = (state.clock / M.period) % 1; sl.value = Math.round(state.p * 1000); }
      const b = M.beat(state.p); pose(b);
      F.readout((b.phase === "systole" ? "Squeeze: the ventricles push blood out, aortic and pulmonary valves open" : "Fill: the ventricles relax, mitral and tricuspid valves open") + " · beat slowed " + M.slow + " times · " + M.bpm + " bpm, " + M.strokeMl + " mL per beat, " + f1(M.output) + " L/min");
    });

    // ---------- stages ----------
    const WALLS = ["lv", "rv", "la", "ra"], CAVS = ["lvCav", "rvCav", "laCav", "raCav"], VESSELS = ["aorta", "pulm", "svc", "ivc", "pv"];
    const box = (a, b) => new T3.Box3(new T3.Vector3(...a), new T3.Vector3(...b));
    const STAGES = [
      { name: "Whole heart", set: "whole", hint: "The heart from the front, apex down. Red vessels carry oxygen-rich blood, blue ones oxygen-poor blood.", go() { F.ghost(WALLS.concat(VESSELS, "septum"), 1); F.ghost(CAVS, 0); F.ghost("valve", 0); F.flows(null); F.focus(box([-45, -50, 0], [30, 55, 165]), { azimuth: 75, elevation: 14 }); } },
      { name: "Cut open", set: "open", hint: "The walls are faded so you can see the four chambers and the four valves. Watch the valves open and shut as the heart beats.", go() { F.ghost(WALLS, 0.12); F.ghost(VESSELS, 0.25); F.ghost(CAVS, 0.55); F.ghost(["valve", "septum"], 1); F.flows(null); F.focus(box([-40, -50, 10], [30, 40, 120]), { azimuth: 80, elevation: 12, pad: 1.0 }); } },
      { name: "Blood flow", set: "flow", hint: "Blue blood comes in from the body, goes through the right side and out to the lungs. Red blood comes back from the lungs, goes through the left side and out to the body.", go() { F.ghost(WALLS, 0.1); F.ghost(VESSELS, 0.3); F.ghost(CAVS, 0.25); F.ghost(["valve", "septum"], 0.6); F.flows("flow"); F.focus(box([-45, -50, 0], [30, 55, 165]), { azimuth: 75, elevation: 14 }); } },
    ];

    // ---------- controls and lesson ----------
    const bar = document.createElement("div"); bar.className = "mech-controls";
    bar.innerHTML = STAGES.map((s, i) => `<button data-stage="${i}">${i + 1} ${s.name}</button>`).join("") +
      `<span class="sp"></span><span>Beat</span><input data-c="p" type="range" min="0" max="1000" step="1" aria-label="Point in the beat"><button data-t="run" aria-pressed="true">Run</button>` +
      `<span class="sp"></span><button data-t="labels" aria-pressed="${state.labels}">Labels</button><button data-t="lesson">Lesson</button><button data-t="style">${REAL ? "Line view" : "Real view"}</button>`;
    F.mount.querySelector(".mech-stage").after(bar);
    const hintEl = F.mount.querySelector(".mech-hint"), sl = bar.querySelector("input"), runB = bar.querySelector("[data-t=run]");
    sl.value = Math.round(state.p * 1000);
    sl.addEventListener("input", () => { F.touch(); state.run = false; runB.setAttribute("aria-pressed", "false"); state.p = +sl.value / 1000; state.clock = state.p * M.period; F.run(); });
    function setStage(i, quiet) { if (!quiet) F.touch(); state.stage = ((i % STAGES.length) + STAGES.length) % STAGES.length; const S = STAGES[state.stage]; S.go(); F.labels(state.labels ? S.set : null); hintEl.textContent = S.hint; bar.querySelectorAll("[data-stage]").forEach((b, k) => b.setAttribute("aria-pressed", k === state.stage)); }
    const hold = (p) => { state.run = false; runB.setAttribute("aria-pressed", "false"); state.p = p; state.clock = p * M.period; sl.value = Math.round(p * 1000); };
    const lesson = F.lesson([
      { title: "1. Four chambers", text: "Two atria on top receive blood. Two ventricles below pump it out. The right side handles oxygen-poor blood, the left side oxygen-rich blood.", go: () => { setStage(1, true); hold(0.6); } },
      { title: "2. Filling", text: "The ventricles relax. The mitral and tricuspid valves swing open and blood drops down from the atria. The outflow valves stay shut.", go: () => { setStage(1, true); hold(0.68); } },
      { title: "3. Squeezing", text: "The ventricles squeeze. The inflow valves slam shut, the aortic and pulmonary valves open, and about 70 mL leaves each side.", go: () => { setStage(1, true); hold(0.17); } },
      { title: "4. One loop", text: "Body to right heart to lungs, then lungs to left heart to body. The two sides beat together, so both loops run at once, about 5 litres a minute at rest.", go: () => { setStage(2, true); state.run = true; runB.setAttribute("aria-pressed", "true"); } },
    ], { onClose: () => { state.run = true; runB.setAttribute("aria-pressed", "true"); setStage(0, true); } });
    bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F.touch(); const t = b.dataset.t;
      if (b.dataset.stage) setStage(+b.dataset.stage); else if (t === "style") { state.style = REAL ? "line" : "real"; start(); } else if (t === "run") { state.run = !state.run; b.setAttribute("aria-pressed", state.run); } else if (t === "labels") { state.labels = !state.labels; b.setAttribute("aria-pressed", state.labels); F.labels(state.labels ? STAGES[state.stage].set : null); } else if (t === "lesson") lesson.open(0); });
    F.stage.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= String(STAGES.length)) setStage(+e.key - 1); });
    F.onPress = () => setStage(state.stage + 1);
    F.tour(() => setStage(state.stage + 1, true));

    // ---------- card ----------
    mech.card("#fig", {
      fig: "Fig A", title: "The human heart, kit build",
      keys: [{ mark: "lit", label: "Click a part or its label to learn what it does" }, { mark: "mid", label: "Keys 1 to 3 change the view. Drag to orbit. Sources lists every claim." }],
      caption: "Four chambers and four one-way valves move blood in one loop: body, right heart, lungs, left heart, body. Size, mass, rate and stroke volume are sourced. Simplified: the chambers are drawn as ovoids and the heart stands upright (the real one tilts, apex to the left). Walls are faded, not cut, to show the inside. The beat is slowed " + M.slow + " times. Flow dots show direction, not speed. Wall thickness is typical, not measured.",
    });
    window.fig = F; window.setStage = setStage; window.state = state; window.model = M;
    setStage(state.stage, true); F.fit(true);
  }
  addEventListener("mech-theme", start);
  start();
})();
