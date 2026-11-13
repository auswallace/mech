/* mech-mesh: an optional add-on that brings parts made in Blender into a mech figure.
   The parts arrive as one .glb (glTF binary) made by a Blender script. Each named object becomes a normal kit part
   through F.add, so click, ghost, labels, explode and the audit see it like a box or a lathe.
   Needs the global THREE (r128) and THREE.GLTFLoader (examples/js/loaders/GLTFLoader.js from the same release).
   Usage, inside start():
     mech.mesh(F, data, (name) => ({ tag, info, color, mat }))   // data: ArrayBuffer, or a base64 string of the .glb
       .then((parts) => { ... parts.lv, parts["mitral_leaf0"] ...; build the rest of the figure });
   The callback decides what each object becomes. Return null to skip an object.
   Coordinates: Blender z-up is kept. The exporter writes glTF y-up; this add-on turns it back.
   Shape keys: a Blender shape key becomes a morph target. mech.morph(part, "open", 0..1) sets it. */
(function (global) {
  const T = global.THREE;
  const yupToZup = new T.Matrix4().makeRotationX(Math.PI / 2);
  function decode(b64) { const s = atob(b64), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a.buffer; }
  function mesh(F, data, spec) {
    const buf = typeof data === "string" ? decode(data) : data;
    return new Promise((ok, fail) => {
      new T.GLTFLoader().parse(buf, "", (gltf) => {
        const parts = {}, root = gltf.scene; root.updateMatrixWorld(true);
        root.traverse((o) => {
          if (!o.isMesh) return;
          const opts = typeof spec === "function" ? spec(o.name, o) : (spec && spec[o.name]);
          if (!opts) return;
          // bake the object's transform and the y-up to z-up turn into the geometry, so the part sits at the origin of the figure
          const g = o.geometry.clone(), m = new T.Matrix4().multiplyMatrices(yupToZup, o.matrixWorld);
          g.applyMatrix4(m);
          const lin = m.clone().setPosition(0, 0, 0), nm = new T.Matrix3().getNormalMatrix(m);
          for (const a of g.morphAttributes.position || []) a.applyMatrix4(lin);   // morph deltas turn with the part, but do not move
          for (const a of g.morphAttributes.normal || []) a.applyNormalMatrix(nm);
          if (!g.attributes.normal) g.computeVertexNormals();
          const p = F.add(g, Object.assign({ edges: 40 }, opts));
          if (g.morphAttributes.position && g.morphAttributes.position.length) {
            p.material.morphTargets = true; p.material.needsUpdate = true;
            p.morphTargetInfluences = g.morphAttributes.position.map(() => 0);
            p.morphTargetDictionary = {}; (o.morphTargetDictionary ? Object.keys(o.morphTargetDictionary) : []).forEach((k, i) => (p.morphTargetDictionary[k] = i));
            if (o.morphTargetInfluences && o.morphTargetDictionary) p.userData.morphNames = Object.keys(o.morphTargetDictionary);
          }
          p.name = o.name; parts[o.name] = p;
        });
        ok(parts);
      }, fail);
    });
  }
  function morph(part, name, value) {
    const i = part.morphTargetDictionary ? part.morphTargetDictionary[name] : undefined;
    if (i === undefined) return;
    part.morphTargetInfluences[i] = value;
    if (part.userData.edges) part.userData.edges.visible = false;   // edge lines do not follow a morph; hide them on a part that bends
  }
  global.mech.mesh = mesh; global.mech.morph = morph; global.mech.meshVERSION = "0.1";
})(window);
