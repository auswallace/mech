"""Record a short animated preview of a built figure.
Usage: python3 scripts/gif.py examples/dns/index.html docs/dns.gif "0:40,2:14" ["js to run at the start of a segment;;..."]
Each segment is stage:frames. Time is stepped by hand, so the motion is smooth on any machine.
Needs: pip install playwright pillow, and Chrome."""
import asyncio, io, os, sys
from playwright.async_api import async_playwright
from PIL import Image

page_path = os.path.abspath(sys.argv[1]); out = os.path.abspath(sys.argv[2])
segs = [(int(a), int(b)) for a, b in (s.split(":") for s in sys.argv[3].split(","))]
acts = sys.argv[4].split(";;") if len(sys.argv) > 4 else []
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE = os.path.join(ROOT, "node_modules/three/build/three.min.js")
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")
STEP = "(()=>{for(let i=0;i<2;i++){__t+=40;const c=__cbs;__cbs=[];c.forEach(f=>f(__t));}})()"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
        pg = await b.new_page(viewport={"width": 760, "height": 800}, device_scale_factor=1)
        await pg.add_init_script("window.__cbs=[];window.__t=1000;window.requestAnimationFrame=f=>{__cbs.push(f);return __cbs.length};window.cancelAnimationFrame=()=>{};")
        async def route(r):
            if "three.min.js" in r.request.url and os.path.exists(THREE):
                await r.fulfill(path=THREE, content_type="application/javascript")
            else:
                await r.continue_()
        await pg.route("**/*", route)
        await pg.goto("file://" + page_path)
        await pg.wait_for_timeout(2500)
        await pg.evaluate("fig.tourCfg = null")
        for _ in range(3): await pg.evaluate(STEP)
        r = await pg.evaluate("(()=>{const r=document.querySelector('#fig').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:Math.min(r.height,r.width*0.74)}})()")
        frames = []
        for i, (stage, n) in enumerate(segs):
            await pg.evaluate(f"window.setStage && setStage({stage})")
            if i < len(acts) and acts[i].strip(): await pg.evaluate(acts[i])
            for _ in range(n):
                await pg.evaluate(STEP)
                png = await pg.screenshot(clip=r, animations="disabled")
                im = Image.open(io.BytesIO(png)).convert("RGB"); im.thumbnail((600, 600)); frames.append(im)
        await b.close()
    pal = frames[len(frames) // 2].quantize(colors=96, method=Image.Quantize.MEDIANCUT)
    q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    q[0].save(out, save_all=True, append_images=q[1:], duration=80, loop=0, optimize=True)
    print(out, len(frames), "frames", os.path.getsize(out) // 1024, "KB")

asyncio.run(main())
