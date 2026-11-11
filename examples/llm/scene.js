/* Inside a small language model. An abstract subject, so position carries the meaning:
   left to right is the order of the tokens, bottom to top is the order of the layers.
   Sizes are those of GPT-2 small: 12 layers, 12 attention heads per layer, 768 numbers per token,
   a vocabulary of 50,257 tokens, a context of 1,024 tokens and about 124 million parameters.
   The attention weights and output probabilities are made up for illustration. */
(function () {
  const THEME = document.documentElement.dataset.theme || "dark";
  // ---------- the model ----------
  const M = {
    layers: 12, heads: 12, width: 768, vocab: 50257, context: 1024, params: "124 million",
    words: ["The", "cat", "sat", "on", "the"],
    attend: [0.06, 0.3, 0.32, 0.22, 0.1],                       // illustrative: how much the last token reads from each token
    next: [["mat", 0.46], ["floor", 0.17], ["couch", 0.11], ["bed", 0.08], ["rug", 0.07], ["table", 0.05], ["roof", 0.03]],   // illustrative
    gap: 16, rise: 9, z0: 26,
  };
  M.x = (t) => (t - (M.words.length - 1) / 2) * M.gap;
  M.z = (k) => M.z0 + k * M.rise;
  M.top = M.z(M.layers);
  const state = { stage: 0, t: 0, hold: null, labels: true, style: location.hash === "#line" ? "line" : "real" };
  let F = null;

  function start() {
    if (F) F.dispose();
    F = new mech.Figure("#fig", { theme: THEME, style: state.style, width: 760, height: 520, azimuth: 34, elevation: 20 });
    const REAL = state.style === "real", last = M.words.length - 1, AMBER = 0xffa033, BLUE = 0x4aa8ff;

    // ---------- bottom: text, tokens, embeddings ----------
    F.box({ w: 100, d: 44, h: 2, r: 3 }, { mat: "darkSteel", at: [0, -2, 0], tag: "base" });
    const tiles = M.words.map((w, t) => {
      const tile = F.box({ w: 12, d: 8, h: 2, r: 1.5 }, { mat: "plastic", at: [M.x(t), -15, 2], tag: "base", info: "token" });
      F.box({ w: 8, d: 8, h: 6, r: 1 }, { mat: "brass", at: [M.x(t), 0, 2], tag: "base", info: "embed" });
      F.tube([[M.x(t), -11, 3], [M.x(t), -7, 4.5], [M.x(t), -4, 5]], 0.4, { mat: "steel", tag: "base" });
      F.cyl({ r: 0.45, h: M.top - 8, n: 10 }, { mat: "steel", at: [M.x(t), 0, 8], tag: "stream", info: "stream", edges: false });
      return tile;
    });
    // ---------- the stack: 12 identical layers ----------
    const layers = [], mlps = [], nodes = [];
    for (let k = 0; k < M.layers; k++) {
      const G = F.group({ at: [0, 0, M.z(k)] }), o = { group: G, tag: "layer" };
      const parts = [F.box({ w: 94, d: 36, h: 0.7, r: 2 }, { mat: "castAl", ...o, tag: "plate", info: "layer" })];
      parts.push(F.box({ w: 84, d: 2.4, h: 1.6, r: 0.6 }, { mat: "brass", at: [0, -11, 0.7], ...o, info: "attention" }));
      mlps.push([]); nodes.push([]);
      M.words.forEach((w, t) => {
        const x = M.x(t);
        const n = F.box({ w: 3.4, d: 3.4, h: 3.4, r: 0.6 }, { mat: "machined", at: [x, 0, 0.7], ...o, info: "stream" });
        const m = F.box({ w: 6, d: 6, h: 3.6, r: 1 }, { mat: "steel", at: [x, 11, 0.7], ...o, info: "mlp" });
        parts.push(n, m, F.box({ w: 0.6, d: 8.2, h: 0.6 }, { mat: "steel", at: [x, -5.6, 1.4], ...o, edges: false }), F.box({ w: 0.6, d: 6.4, h: 0.6 }, { mat: "steel", at: [x, 4.9, 1.4], ...o, edges: false }));
        nodes[k].push(n); mlps[k].push(m);
      });
      layers.push({ G, parts });
    }
    // ---------- attention: the last token reads from the earlier ones ----------
    const arcs = F.group({ at: [0, 0, M.z(5)], info: "attention" });
    const arcMesh = M.attend.map((w, t) => {
      if (t === last) return F.torus({ R: 3.2, r: 0.3 + w * 2 }, { color: AMBER, at: [M.x(t), 0, 4.6], group: arcs, tag: "arcs" });
      const xa = M.x(last), xb = M.x(t), lift = 6 + (last - t) * 3.2;
      return F.tube([[xa, -1.6, 2.4], [xa - 2, -9, 2.4 + lift * 0.7], [(xa + xb) / 2, -13, 2.4 + lift], [xb + 2, -9, 2.4 + lift * 0.7], [xb, -1.6, 2.4]], 0.25 + w * 2.2, { color: AMBER, group: arcs, tag: "arcs" });
    });
    arcMesh.forEach((m) => m.material.emissive.setHex(AMBER));
    // ---------- top: scores for the next token ----------
    F.box({ w: 94, d: 10, h: 3, r: 1.2 }, { mat: "brass", at: [0, 0, M.top], tag: "out", info: "unembed" });
    const bars = M.next.map(([w, p], i) => {
      const x = (i - (M.next.length - 1) / 2) * 12;
      const b = F.box({ w: 8, d: 8, h: 44, r: 1 }, { mat: i ? "steel" : "machined", at: [x, 0, M.top + 3], tag: "out", info: "probs" });
      F.label("w" + i, { text: w + " " + Math.round(p * 100) + "%", on: [x, 0, M.top + 3 + p * 44 + 5], set: "out", pin: true });
      return b;
    });
    const pulse = F.add(new THREE.SphereGeometry(1.9, 16, 12), { color: BLUE, tag: "pulse", edges: false, shadow: false }); pulse.material.emissive.setHex(BLUE);
    M.words.forEach((w, t) => F.label("t" + t, { text: w, on: [M.x(t), -15, 6.5], set: "all", pin: true }));

    // ---------- what each part is ----------
    F.describe({
      token: { name: "Token", role: "The text is cut into tokens: words or pieces of words. The model only sees a list of token numbers.", fact: "The vocabulary has " + M.vocab.toLocaleString("en-US") + " tokens. The model reads up to " + M.context.toLocaleString("en-US") + " at once." },
      embed: { name: "Embedding", role: "A lookup table. It swaps each token number for a list of numbers that stands for its meaning and its position.", fact: M.width + " numbers per token." },
      stream: { name: "Residual stream", role: "Each token carries its list of numbers up through the stack. Every layer reads it and adds to it." },
      layer: { name: "Layer", role: "One round of attention, then one MLP. All layers have the same shape and different learned weights.", fact: M.layers + " layers, about " + M.params + " parameters in total." },
      attention: { name: "Attention", role: "Lets a token read from the tokens before it. This is the only place where tokens share information.", fact: M.heads + " heads per layer. Each head looks for a different kind of link." },
      mlp: { name: "MLP", role: "A small network that works on one token at a time. It rewrites the token's numbers with what attention gathered." },
      unembed: { name: "Unembedding", role: "Turns the last token's final numbers into one score for every token in the vocabulary." },
      probs: { name: "Next-token probabilities", role: "The scores become probabilities. The model picks one token, adds it to the text and runs again.", fact: "The values here are made up for illustration." },
    });
    F.label("token", { set: "whole", on: tiles[0] }); F.label("embed", { set: "whole" }); F.label("layer", { set: "whole", on: layers[8].parts[0] }); F.label("stream", { set: "whole", on: nodes[3][0] }); F.label("unembed", { set: "whole" }); F.label("probs", { set: "whole", on: bars[0] });
    F.label("token", { set: "tokens", on: tiles[0] }); F.label("embed", { set: "tokens" }); F.label("stream", { set: "tokens", on: [M.x(1), 0, 16] });
    F.label("attention", { set: "layer", on: layers[5].parts[1] }); F.label("mlp", { set: "layer", on: mlps[5][1] }); F.label("stream", { set: "layer", on: nodes[5][0] });
    F.label("unembed", { set: "out" }); F.label("probs", { set: "out", on: [bars[1].position.x, 0, M.top + 8] });

    // ---------- running: one token's trip up the stack ----------
    const EMBED = 2, PER = 1.3, OUT = 3.2, TOTAL = EMBED + M.layers * PER + OUT;
    F.onFrame((dt) => {
      if (!F.reduced && !state.hold) state.t = (state.t + dt) % TOTAL;
      let t = state.t, k = -1, part = "embed", grow = 0, u = 0;
      if (state.hold) { k = state.hold.k; part = state.hold.part; u = (F.time * 0.7) % 1; grow = part === "out" ? Math.min(1, (F.time % 3) / 1.2) : 0; }
      else if (t < EMBED) { u = t / EMBED; }
      else if (t < EMBED + M.layers * PER) { const q = (t - EMBED) / PER; k = Math.floor(q); u = q - k; part = u < 0.5 ? "attention" : "mlp"; }
      else { part = "out"; k = M.layers; grow = Math.min(1, (t - EMBED - M.layers * PER) / 1.4); }
      const xl = M.x(last);
      if (part === "embed") pulse.position.set(xl, -15 + 15 * Math.min(1, u * 1.6), 5 + 6 * u);
      else if (part === "out") pulse.position.set(xl, 0, M.top + 1.5);
      else pulse.position.set(xl, part === "mlp" ? 11 * Math.sin(Math.PI * ((state.hold ? u : (u - 0.5) * 2))) : 0, M.z(Math.min(k, M.layers - 1)) + 2.4 + (part === "mlp" && !state.hold ? (u - 0.5) * 2 * 2 : 0));
      const showArcs = part === "attention";
      arcs.position.z = M.z(Math.max(0, Math.min(k, M.layers - 1)));
      const pulseA = 0.55 + 0.45 * Math.sin(F.time * 6);
      arcMesh.forEach((m) => { m.visible = showArcs && m.userData.alpha > 0.01; m.material.emissiveIntensity = pulseA; });
      for (let j = 0; j < M.layers; j++) mlps[j].forEach((m, tt) => F.glow(m, j === k && part === "mlp" && tt === last ? 0.9 : 0, BLUE));
      bars.forEach((b, i) => { b.scale.z = Math.max(0.02, M.next[i][1] * (part === "out" ? grow : state.stage === 4 ? 1 : 0.02)); });
      F.readout(part === "embed" ? "5 tokens in · " + M.width + " numbers each" : part === "out" ? "output · one score for each of " + M.vocab.toLocaleString("en-US") + " tokens" : "layer " + (k + 1) + " of " + M.layers + " · " + (part === "attention" ? "attention reads earlier tokens" : "MLP rewrites this token"));
    });

    // ---------- stages ----------
    const box = (a, b) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b));
    const only = (k) => layers.forEach((L, j) => F.ghost(L.G, j === k ? 1 : 0.03));
    const plates = (a) => F.ghost("plate", a);
    const base = () => { F.ghost(["base", "stream", "layer", "out", "arcs", "pulse"], 1); plates(REAL ? 0.22 : 0.3); state.hold = null; };
    const STAGES = [
      { name: "Whole model", set: "whole", hint: "Text goes in at the bottom. A guess for the next word comes out at the top.", go() { base(); F.focus(null, { azimuth: 34, elevation: 20, pad: 1.05 }); } },
      { name: "Tokens", set: "tokens", hint: "Each word becomes a token, and each token becomes a list of 768 numbers.", go() { base(); state.hold = { k: -1, part: "embed" }; F.focus(box([-46, -22, 0], [46, 18, 30]), { azimuth: 28, elevation: 28, pad: 1.0 }); } },
      { name: "One layer", set: "layer", hint: "Every layer has two parts: attention at the front, an MLP for each token at the back.", go() { base(); only(5); plates(0.03); F.ghost(layers[5].G, 1); F.ghost(layers[5].parts[0], 0.3); state.hold = { k: 5, part: "mlp" }; F.focus(box([-48, -20, M.z(5) - 4], [48, 18, M.z(5) + 16]), { azimuth: 30, elevation: 34, pad: 0.95 }); } },
      { name: "Attention", set: "layer", hint: "The last token reads from the earlier ones. A thicker line means it reads more from that token.", go() { base(); only(5); plates(0.03); F.ghost(layers[5].G, 1); F.ghost(layers[5].parts[0], 0.3); state.hold = { k: 5, part: "attention" }; F.focus(box([-48, -20, M.z(5) - 4], [48, 18, M.z(5) + 22]), { azimuth: 16, elevation: 26, pad: 0.95 }); } },
      { name: "Output", set: "out", hint: "The top turns the last token's numbers into a probability for every possible next token.", go() { base(); state.hold = { k: M.layers, part: "out" }; F.focus(box([-48, -10, M.top - 12], [48, 10, M.top + 30]), { azimuth: 30, elevation: 18, pad: 1.0 }); } },
    ];

    // ---------- controls ----------
    const bar = document.createElement("div"); bar.className = "mech-controls";
    bar.innerHTML = STAGES.map((s, i) => `<button data-stage="${i}">${i + 1} ${s.name}</button>`).join("") +
      `<span class="sp"></span><button data-t="labels" aria-pressed="${state.labels}">Labels</button><button data-t="lesson">Lesson: follow one token</button><button data-t="quiz">Quiz</button><button data-t="style">${REAL ? "Line view" : "Real view"}</button>`;
    F.mount.querySelector(".mech-stage").after(bar);
    const hintEl = F.mount.querySelector(".mech-hint");
    function setStage(i, quiet) { if (!quiet) F.touch(); state.stage = ((i % STAGES.length) + STAGES.length) % STAGES.length; const S = STAGES[state.stage]; S.go(); F.labels(state.labels ? S.set : null); hintEl.textContent = S.hint; bar.querySelectorAll("[data-stage]").forEach((b, k) => b.setAttribute("aria-pressed", k === state.stage)); }
    const lesson = F.lesson([
      { title: "1. Text becomes tokens", text: "The model can't read letters. The text is cut into tokens, and each token is a number from a fixed vocabulary of " + M.vocab.toLocaleString("en-US") + ".", go: () => setStage(1, true) },
      { title: "2. Tokens become numbers", text: "The embedding table swaps each token for " + M.width + " numbers. From here on, the model only does arithmetic on these lists.", go: () => setStage(1, true) },
      { title: "3. Attention: read from the others", text: "In each layer, a token first looks back at the earlier tokens and copies in what it needs. To guess the word after \"the\", it leans on \"sat\" and \"on\".", go: () => setStage(3, true) },
      { title: "4. MLP: think about it", text: "Then a small network rewrites the token's numbers on its own. Most of what the model knows is stored in these blocks.", go: () => setStage(2, true) },
      { title: "5. Repeat " + M.layers + " times", text: "The same two steps run in every layer. Each layer adds a little to the list of numbers, and nothing is thrown away.", go: () => setStage(0, true) },
      { title: "6. Pick the next token", text: "The top turns the last token's numbers into a probability for each token in the vocabulary. One is picked and added to the text. Then the whole stack runs again.", go: () => setStage(4, true) },
    ], { onClose: () => setStage(0, true) });
    const quiz = F.quiz([
      { ask: "Click the part that swaps a token for a list of numbers.", key: "embed" },
      { ask: "Click the part where tokens read from each other.", key: "attention" },
      { ask: "Click a block that rewrites one token on its own.", key: "mlp" },
      { ask: "Click the part that turns the final numbers into scores.", key: "unembed", also: ["probs"] },
    ]);
    bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F.touch(); const t = b.dataset.t;
      if (b.dataset.stage) setStage(+b.dataset.stage); else if (t === "style") { state.style = REAL ? "line" : "real"; start(); } else if (t === "labels") { state.labels = !state.labels; b.setAttribute("aria-pressed", state.labels); setStage(state.stage, true); } else if (t === "lesson") lesson.open(0); else if (t === "quiz") { setStage(0); quiz.start(); } });
    F.stage.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= "5") setStage(+e.key - 1); });
    F.onPress = () => setStage(state.stage + 1);
    F.tour(() => setStage(state.stage + 1, true));

    mech.card("#fig", {
      fig: "Fig 2", title: "Inside a small language model",
      keys: [{ mark: "lit", label: "Click a part to learn what it does" }, { mark: "mid", label: "Keys 1 to 5 change the view. Drag to orbit." }],
      caption: "A language model has no moving parts, so this is a map of the idea and not a picture of hardware. Left to right is the order of the tokens. Bottom to top is the order of the layers. The sizes are those of GPT-2 small: " + M.layers + " layers, " + M.heads + " attention heads per layer, " + M.width + " numbers per token and about " + M.params + " parameters. The attention lines show one made-up pattern, and the output probabilities are made up too.",
    });
    window.fig = F; window.setStage = setStage; window.state = state;
    setStage(state.stage, true); F.fit(true);
  }
  start();
})();
