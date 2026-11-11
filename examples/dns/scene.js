/* How DNS finds the address of a website. A conversation, so the layout is: each party is a station at a fixed place,
   and each message is a packet that travels between two stations. Nearer the laptop is "your side", farther is "the internet".
   The three kinds of name server stand on steps: root highest, then the .com servers, then the site's own name server.
   www.example.com and 192.0.2.10 are reserved documentation values, not a real lookup. The TTL of 3600 s is made up. */
(function () {
  // ---------- 1. the model ----------
  const M = {
    name: "www.example.com", ip: "192.0.2.10", ttl: 3600, roots: 13, port: 53,
    at: { laptop: [-66, -22, 13], resolver: [-14, 0, 36], root: [54, 36, 66], tld: [54, 0, 50], auth: [54, -36, 34] },
    who: { laptop: "laptop", resolver: "resolver", root: "root server", tld: ".com server", auth: "example.com name server" },
    // the cold lookup, in order. q = question, r = reply.
    cold: [
      { from: "laptop", to: "resolver", kind: "q", say: "Where is www.example.com?", note: "Your laptop asks one resolver and waits. The resolver does all the rest." },
      { from: "resolver", to: "root", kind: "q", say: "Where is www.example.com?", note: "The resolver has nothing saved, so it starts at the top: a root server." },
      { from: "root", to: "resolver", kind: "r", say: "Not here. Ask the .com servers.", note: "The root does not know the address. It knows who runs .com, and it replies with a referral." },
      { from: "resolver", to: "tld", kind: "q", say: "Where is www.example.com?", note: "The resolver asks the same question again, one level down." },
      { from: "tld", to: "resolver", kind: "r", say: "Not here. Ask example.com's name server.", note: "The .com server knows which name servers hold the records for example.com. Another referral." },
      { from: "resolver", to: "auth", kind: "q", say: "Where is www.example.com?", note: "Third time, to the server that holds the real records." },
      { from: "auth", to: "resolver", kind: "r", say: "192.0.2.10, keep for 3600 s", note: "This server is the authority for example.com. It replies with the address and how long the answer can be kept." },
      { from: "resolver", to: "laptop", kind: "r", say: "192.0.2.10", note: "The resolver saves the answer in its cache and passes it to your laptop. Now the browser can connect." },
    ],
  };
  M.cached = [M.cold[0], Object.assign({}, M.cold[7], { note: "The answer is still in the cache, so the resolver replies at once. No name server is asked." })];
  const state = { stage: 0, hold: null, t: 0, i: 0, cached: false, left: 0, labels: true, style: location.hash === "#line" ? "line" : "real" };
  let F = null;

  function start() {
    if (F) F.dispose();
    F = new mech.Figure("#fig", { theme: document.documentElement.dataset.theme || "dark", style: state.style, width: 760, height: 480, azimuth: -30, elevation: 28 });
    const REAL = state.style === "real", BLUE = 0x4aa8ff, AMBER = 0xffa033, A = M.at;

    F.facts([
      { id: "order", claim: "A resolver with nothing saved asks a root server, then a top-level domain server, then the domain's authoritative server.", status: "sourced", source: "ManageEngine, How DNS works", url: "https://www.manageengine.com/products/oputils/tech-topics/how-dns-works.html" },
      { id: "referral", claim: "Root and top-level domain servers do not return the address. They return a referral to the next servers.", status: "sourced", source: "ManageEngine, How DNS works", url: "https://www.manageengine.com/products/oputils/tech-topics/how-dns-works.html" },
      { id: "roots", claim: "There are 13 root server identities, named a to m. Each one is many machines around the world.", status: "sourced", source: "pickuma, How DNS resolution works", url: "https://dev.to/pickuma/how-dns-resolution-actually-works-step-by-step-1d60" },
      { id: "port", claim: "DNS questions go over UDP port 53 by default.", status: "sourced", source: "pickuma, How DNS resolution works", url: "https://dev.to/pickuma/how-dns-resolution-actually-works-step-by-step-1d60" },
      { id: "ttl", claim: "The resolver keeps an answer for its time to live (TTL). Until then it replies from the cache and asks no name server.", status: "sourced", source: "ManageEngine, How DNS works", url: "https://www.manageengine.com/products/oputils/tech-topics/how-dns-works.html" },
      { id: "example", claim: "www.example.com, the address 192.0.2.10 and the TTL of 3600 seconds.", status: "illustrative", source: "Reserved documentation name and address. Not a real lookup." },
    ]);
    F.check("cold lookup has 8 messages", M.cold.length === 8);
    F.check("every question gets a reply from the party that was asked", M.cold.every((m, i) => m.kind !== "q" || (M.cold.slice(i + 1).find((r) => r.kind === "r" && r.from === m.to && r.to === m.from))));
    F.check("servers are asked in the order root, .com, authoritative", M.cold.filter((m) => m.kind === "q" && m.from === "resolver").map((m) => m.to).join() === "root,tld,auth");
    F.check("only the authoritative server replies with the address", M.cold.filter((m) => m.say.includes(M.ip)).every((m) => m.from === "auth" || m.from === "resolver"));
    F.check("a cached lookup asks no name server", M.cached.length === 2 && M.cached.every((m) => ["laptop", "resolver"].includes(m.from) && ["laptop", "resolver"].includes(m.to)));

    // ---------- 2. stations ----------
    F.box({ w: 176, d: 124, h: 2, r: 5 }, { mat: "darkSteel", at: [-4, 2, -2], tag: "floor" });
    // laptop
    F.box({ w: 22, d: 30, h: 1.6, r: 2 }, { mat: "castAl", at: [-66, -22, 0], tag: "st", info: "laptop" });
    F.box({ w: 1.4, d: 30, h: 20, r: 1.5 }, { mat: "castAl", at: [-55.5, -22, 1], rot: [0, 0.3, 0], tag: "st", info: "laptop" });
    const screen = F.box({ w: 0.4, d: 26, h: 16, r: 1 }, { mat: "glass", at: [-56.4, -22, 3], rot: [0, 0.3, 0], tag: "st", info: "laptop", edges: false });
    for (let r = 0; r < 4; r++) F.box({ w: 2.6, d: 24, h: 0.3 }, { mat: "plastic", at: [-72 + r * 4, -22, 1.6], tag: "st", info: "laptop", edges: false, shadow: false });
    // rack server builder
    const rack = (x, y, z, h, info, units) => {
      F.box({ w: 20, d: 24, h, r: 1.5 }, { mat: "darkSteel", at: [x, y, z], tag: "st", info });
      const leds = [];
      for (let u = 0; u < units; u++) { const uz = z + 2 + u * ((h - 4) / units); F.box({ w: 0.6, d: 21, h: (h - 4) / units - 0.9, r: 0.3 }, { mat: "castAl", at: [x - 10.2, y, uz], tag: "st", info, edges: false, shadow: false }); leds.push(F.led([x - 10.6, y - 8, uz + 0.8], 0.5, { tag: "st", color: BLUE })); leds[u].rotation.y = -Math.PI / 2; }
      return leds;
    };
    const plinth = (x, y, h) => h && F.box({ w: 28, d: 30, h, r: 2 }, { mat: "castAl", at: [x, y, 0], tag: "floor" });
    const ledR = rack(-14, 0, 0, 34, "resolver", 5);
    plinth(54, 36, 32); plinth(54, 0, 16);
    const ledRoot = rack(54, 36, 32, 32, "root", M.roots), ledTld = rack(54, 0, 16, 32, "tld", 4), ledAuth = rack(54, -36, 0, 32, "auth", 3);
    // the resolver's cache: a shelf with one slot that fills
    F.box({ w: 20, d: 12, h: 1.2, r: 0.6 }, { mat: "castAl", at: [-14, -19, 10], tag: "st", info: "cache" });
    F.box({ w: 20, d: 1, h: 9, r: 0.4 }, { mat: "castAl", at: [-14, -24.6, 10], tag: "st", info: "cache" });
    const entry = F.box({ w: 14, d: 8, h: 5, r: 1 }, { color: AMBER, at: [-14, -19, 11.2], tag: "entry", info: "cache" }); entry.material.emissive.setHex(AMBER);
    // links between stations
    const wire = (a, b) => F.tube(Array.from({ length: 9 }, (_, k) => mech.hop(A[a], A[b], k / 8, 13)), 0.22, { mat: "steel", tag: "wire", shadow: false });
    wire("laptop", "resolver"); wire("resolver", "root"); wire("resolver", "tld"); wire("resolver", "auth");
    // the packet
    const packet = F.box({ w: 11, d: 7.4, h: 1.8, r: 1 }, { color: BLUE, tag: "packet", info: "packet", shadow: false }); packet.material.emissive.setHex(BLUE);
    const bubble = F.label("packet", { text: "", on: packet, set: "all", pin: true, box: true, offset: [0, 0, 9] });

    // ---------- 3. what each part is ----------
    F.describe({
      laptop: { name: "Your laptop", role: "It wants to open www.example.com but only has the name. It asks a resolver for the address and waits for one reply." },
      resolver: { name: "Recursive resolver", role: "A server run by your internet provider or a public service. It does the legwork: it asks each name server in turn and brings back the answer.", fact: "Questions go over UDP port 53 by default.", src: "port" },
      cache: { name: "Resolver cache", role: "Where the resolver keeps answers it already found. A saved answer is used until its time to live runs out.", fact: "A cached answer skips all three name servers.", src: "ttl" },
      root: { name: "Root server", role: "The top of the naming tree. It does not know the address. It knows which servers run each ending, like .com or .org.", fact: "13 root server identities, a to m.", src: "roots" },
      tld: { name: ".com server", role: "A top-level domain server. It knows, for each name that ends in .com, which name servers hold its records.", fact: "It replies with a referral, not the address.", src: "referral" },
      auth: { name: "Authoritative name server", role: "The server that holds the real records for example.com. Its reply is the final answer." },
      packet: { name: "DNS message", role: "One question or one reply. Blue is a question. Orange is a reply." },
    });
    for (const k of ["laptop", "resolver", "cache", "root", "tld", "auth"]) F.label(k, { set: "all", on: k === "cache" ? entry.parent && [-14, -22, 20] : k === "laptop" ? [-66, -30, 3] : [M.at[k][0] - 6, M.at[k][1] - 12, M.at[k][2] - 8] });

    // ---------- 4. running ----------
    const HOP = 1.7, PAUSE = 0.5, leds = { resolver: ledR, root: ledRoot, tld: ledTld, auth: ledAuth };
    F.onFrame((dt) => {
      const seq = state.cached ? M.cached : M.cold;
      if (!F.reduced) state.t += dt;
      if (state.hold !== null) { state.i = state.hold; if (state.t > HOP + PAUSE + 0.4) state.t = 0; }
      else if (state.t > HOP + PAUSE) { state.t = 0; state.i++; if (state.i >= seq.length) { state.i = 0; if (!state.cached) { state.cached = true; state.left = M.ttl; } } }
      if (state.cached && state.hold === null) { state.left -= dt * 260; if (state.left <= 0 && state.i === 0 && state.t < 0.1) { state.cached = false; } }
      const m = (state.hold !== null ? M.cold : seq)[Math.min(state.i, (state.hold !== null ? M.cold : seq).length - 1)], u = Math.min(1, state.t / HOP), e = u * u * (3 - 2 * u);
      const p = mech.hop(A[m.from], A[m.to], e, 13); packet.position.set(p[0], p[1], p[2] + 2);
      const col = m.kind === "q" ? BLUE : AMBER; packet.material.color.setHex(col); packet.material.emissive.setHex(col);
      if (bubble.el.textContent !== m.say) bubble.text(m.say);
      const have = state.hold !== null ? state.hold >= 7 : state.cached || (state.i === 7 && u > 0.05);
      entry.visible = have && entry.userData.alpha > 0.01;
      for (const k in leds) leds[k].forEach((l, n) => F.setLed(l, (m.to === k && u > 0.9) || (m.from === k && u < 0.15) ? true : (n + Math.floor(F.time * 2)) % 7 === 0));
      F.glow(screen, m.to === "laptop" && u > 0.9 ? 0.8 : 0.15, 0x9fd0ff);
      const n = state.i + 1, total = (state.hold !== null ? M.cold : seq).length;
      F.readout("message " + n + " of " + total + " · " + M.who[m.from] + " to " + M.who[m.to] + " · cache: " + (have ? M.name + " = " + M.ip + (state.cached && state.hold === null ? ", " + Math.max(0, Math.round(state.left)) + " s left" : "") : "empty"));
      if (noteEl && state.hold === null && noteEl.dataset.k !== state.cached + ":" + state.i) { noteEl.dataset.k = state.cached + ":" + state.i; hintEl.textContent = m.note; }
    });

    // ---------- 5. stages ----------
    const box = (a, b) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b));
    const whole = box([-84, -52, 0], [72, 56, 72]);
    const view = (hold, bx2, az, el) => () => { state.hold = hold; state.t = 0; if (hold === null) { state.i = 0; state.cached = false; } F.ghost(["floor", "st", "wire", "packet", "entry"], 1); F.focus(bx2 || whole, { azimuth: az ?? -30, elevation: el ?? 28, pad: 1.0 }); };
    const STAGES = [
      { name: "Whole lookup", go: view(null) },
      { name: "Ask the resolver", go: view(0, box([-84, -40, 0], [4, 24, 44]), -24, 24) },
      { name: "Root", go: view(2) },
      { name: ".com", go: view(4) },
      { name: "The answer", go: view(6) },
      { name: "Cache", go: view(7, box([-84, -40, 0], [4, 24, 44]), -24, 24) },
    ];

    // ---------- 6. controls ----------
    const bar = document.createElement("div"); bar.className = "mech-controls";
    bar.innerHTML = STAGES.map((s, i) => `<button data-stage="${i}">${i + 1} ${s.name}</button>`).join("") +
      `<span class="sp"></span><button data-t="labels" aria-pressed="${state.labels}">Labels</button><button data-t="lesson">Lesson: one lookup, message by message</button><button data-t="quiz">Quiz</button><button data-t="style">${REAL ? "Line view" : "Real view"}</button>`;
    F.mount.querySelector(".mech-stage").after(bar);
    const hintEl = F.mount.querySelector(".mech-hint"), noteEl = hintEl;
    function setStage(i, quiet) { if (!quiet) F.touch(); state.stage = ((i % STAGES.length) + STAGES.length) % STAGES.length; STAGES[state.stage].go(); F.labels(state.labels ? "all" : "none"); hintEl.dataset.k = ""; hintEl.textContent = state.hold !== null ? M.cold[state.hold].note : M.cold[0].note; bar.querySelectorAll("[data-stage]").forEach((b, k) => b.setAttribute("aria-pressed", k === state.stage)); }
    const lesson = F.lesson(M.cold.map((m, i) => ({ title: (i + 1) + ". " + M.who[m.from][0].toUpperCase() + M.who[m.from].slice(1) + " to " + M.who[m.to], text: "“" + m.say + "” " + m.note, go: () => { view(i)(); F.labels(state.labels ? "all" : "none"); } }))
      .concat([{ title: "9. The second time", text: "Ask again before the time to live runs out, and the resolver replies from its cache. Two messages, not eight.", go: () => { view(null)(); state.cached = true; state.left = M.ttl; F.labels(state.labels ? "all" : "none"); } }]), { onClose: () => setStage(0, true) });
    const quiz = F.quiz([
      { ask: "Click the party that does the legwork for your laptop.", key: "resolver" },
      { ask: "Click the server that knows who runs .com, but not the address.", key: "root" },
      { ask: "Click the server that holds the real records for example.com.", key: "auth" },
      { ask: "Click the place where a found answer is kept for next time.", key: "cache" },
    ]);
    bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F.touch(); const t = b.dataset.t;
      if (b.dataset.stage) setStage(+b.dataset.stage); else if (t === "style") { state.style = REAL ? "line" : "real"; start(); } else if (t === "labels") { state.labels = !state.labels; b.setAttribute("aria-pressed", state.labels); F.labels(state.labels ? "all" : "none"); } else if (t === "lesson") lesson.open(0); else if (t === "quiz") { setStage(0); quiz.start(); } });
    F.stage.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= "6") setStage(+e.key - 1); });
    F.onPress = () => setStage(state.stage + 1);

    mech.card("#fig", {
      fig: "Fig 5", title: "How DNS finds the address of a website",
      keys: [{ mark: "lit", label: "Click a station to learn what it does" }, { mark: "mid", label: "Blue packet: a question. Orange packet: a reply. Keys 1 to 6 hold one message." }],
      caption: "A lookup with nothing saved takes eight messages: your laptop asks a resolver, and the resolver asks a root server, a .com server and the site's own name server in turn. The first two only say who to ask next. The answer is then saved, so the next lookup takes two messages until the saved answer expires. This is a map of the conversation, not a picture of real machines. The name, the address and the 3600 second time to live are documentation values. The countdown runs fast. Open Sources for where each claim comes from.",
    });
    window.fig = F; window.setStage = setStage; window.state = state;
    setStage(state.stage, true); F.fit(true);
  }
  addEventListener("mech-theme", start);
  start();
})();
