/* Template scene. Copy this file to examples/<name>/scene.js and fill in each section.
   State the unit, the axes, and where the facts come from, here at the top. */
(function () {
  // ---------- 1. the model: every number on screen comes from here ----------
  const M = { /* verified facts and sizes */ };
  const state = { stage: 0, labels: true, style: location.hash === "#line" ? "line" : "real" };
  let F = null;

  function start() {
    if (F) F.dispose();
    F = new mech.Figure("#fig", { theme: document.documentElement.dataset.theme || "dark", style: state.style, width: 760, height: 480, azimuth: 38, elevation: 24 });
    const REAL = state.style === "real";

    // ---------- facts and checks: every shown number has a status and a source (references/accuracy.md) ----------
    F.facts([{ id: "example", claim: "One claim the reader will see.", status: "illustrative" }]);
    F.check("a test that ties the model to the facts", true);

    // ---------- 2. parts: mechanism first, covers second, shell last. Give parts a tag and an info key. ----------
    const base = F.box({ w: 60, d: 40, h: 4, r: 3 }, { mat: "darkSteel", tag: "base", info: "base" });
    const part = F.cyl({ r: 8, h: 20, n: 32 }, { mat: "machined", at: [0, 0, 4], tag: "moving", info: "part" });

    // ---------- 3. what each part is ----------
    F.describe({
      base: { name: "Base", role: "What it does, in one plain sentence." },
      part: { name: "Part", role: "What it does, and why it matters.", fact: "One true number.", src: "example" },
    });
    F.label("base", { set: "whole" }); F.label("part", { set: "whole" });

    // ---------- 4. running: read the state, move the parts, write the readout ----------
    F.onFrame((dt, t) => { part.rotation.z = t; F.readout("state in plain words"); });

    // ---------- 5. stages: what is solid, ghosted or hidden, and where the camera looks ----------
    const STAGES = [
      { name: "Whole", set: "whole", hint: "One sentence about what the reader sees.", go() { F.ghost(["base", "moving"], 1); F.focus(null, { azimuth: 38, elevation: 24 }); } },
      { name: "Inside", set: "whole", hint: "One sentence about what the reader sees.", go() { F.ghost("base", 0.06); F.focus(part, { azimuth: 30, elevation: 20, pad: 1.4 }); } },
    ];

    // ---------- 6. controls, lesson, quiz ----------
    const bar = document.createElement("div"); bar.className = "mech-controls";
    bar.innerHTML = STAGES.map((s, i) => `<button data-stage="${i}">${i + 1} ${s.name}</button>`).join("") +
      `<span class="sp"></span><button data-t="labels" aria-pressed="${state.labels}">Labels</button><button data-t="lesson">Lesson</button><button data-t="quiz">Quiz</button><button data-t="style">${REAL ? "Line view" : "Real view"}</button>`;
    F.mount.querySelector(".mech-stage").after(bar);
    const hintEl = F.mount.querySelector(".mech-hint");
    function setStage(i, quiet) { if (!quiet) F.touch(); state.stage = ((i % STAGES.length) + STAGES.length) % STAGES.length; const S = STAGES[state.stage]; S.go(); F.labels(state.labels ? S.set : null); hintEl.textContent = S.hint; bar.querySelectorAll("[data-stage]").forEach((b, k) => b.setAttribute("aria-pressed", k === state.stage)); }
    const lesson = F.lesson([
      { title: "1. First step", text: "One or two sentences. Show one thing.", go: () => setStage(0, true) },
      { title: "2. Second step", text: "One or two sentences. Show one thing.", go: () => setStage(1, true) },
    ], { onClose: () => setStage(0, true) });
    const quiz = F.quiz([{ ask: "Click the part that ...", key: "part" }]);
    bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F.touch(); const t = b.dataset.t;
      if (b.dataset.stage) setStage(+b.dataset.stage); else if (t === "style") { state.style = REAL ? "line" : "real"; start(); } else if (t === "labels") { state.labels = !state.labels; b.setAttribute("aria-pressed", state.labels); setStage(state.stage, true); } else if (t === "lesson") lesson.open(0); else if (t === "quiz") { setStage(1); quiz.start(); } });
    F.stage.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= String(STAGES.length)) setStage(+e.key - 1); });
    F.onPress = () => setStage(state.stage + 1);
    F.tour(() => setStage(state.stage + 1, true));

    // ---------- 7. card: state every simplification in the caption ----------
    mech.card("#fig", { fig: "Fig 1", title: "Title of the figure", keys: [{ mark: "lit", label: "Click a part to learn what it does" }], caption: "What this is, where the numbers come from, and what is simplified." });
    window.fig = F; window.setStage = setStage; window.state = state;
    setStage(state.stage, true); F.fit(true);
  }
  addEventListener("mech-theme", start);   // the theme button in the card rebuilds the figure
  start();
})();
