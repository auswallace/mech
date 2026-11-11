"""Screenshot a built figure at each stage, plus optional close-ups.
Usage: python3 scripts/capture.py examples/v8-suv/index.html shots [stage,stage,...]
Needs: pip install playwright, and Chrome. three.js is served from node_modules when the CDN is not reachable."""
import asyncio, os, sys
from playwright.async_api import async_playwright

page_path = os.path.abspath(sys.argv[1])
out = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else "shots")
stages = [int(s) for s in sys.argv[3].split(",")] if len(sys.argv) > 3 else [0, 1, 2, 3, 4]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE = os.path.join(ROOT, "node_modules/three/build/three.min.js")
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")

async def main():
    os.makedirs(out, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
        pg = await b.new_page(viewport={"width": 820, "height": 860}, device_scale_factor=2)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        async def route(r):
            if "three.min.js" in r.request.url and os.path.exists(THREE):
                await r.fulfill(path=THREE, content_type="application/javascript")
            else:
                await r.continue_()
        await pg.route("**/*", route)
        await pg.goto("file://" + page_path)
        await pg.wait_for_timeout(1500)
        for s in stages:
            await pg.evaluate(f"window.setStage && setStage({s})")
            await pg.wait_for_timeout(2600)
            await pg.locator("#fig").screenshot(path=os.path.join(out, f"stage{s}.png"))
        print("errors:", errs)
        await b.close()

asyncio.run(main())
