// Build one self-contained page from the kit and a scene script.
// Usage: node scripts/build.mjs examples/v8-suv [--light]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(process.argv[2] || ".");
const theme = process.argv.includes("--light") ? "light" : "dark";
const kit = readFileSync(join(ROOT, "kit/mech.js"), "utf8");
const scene = readFileSync(join(dir, "scene.js"), "utf8");
const title = (scene.match(/fig:\s*"[^"]*",\s*title:\s*"([^"]+)"/) || [, "Figure"])[1];
const css = (kit.match(/const CSS = `([\s\S]*?)`;/) || [, ""])[1];

const html = `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${css}</style>
</head>
<body>
<div id="fig"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
${kit}
</script>
<script>
${scene}
</script>
</body>
</html>
`;
const out = join(dir, theme === "light" ? "index-light.html" : "index.html");
writeFileSync(out, html);
console.log("wrote", out, Math.round(html.length / 1024) + " KB");
