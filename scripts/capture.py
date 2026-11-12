"""Screenshot a built figure at each stage, plus optional close-ups.
Usage: python3 scripts/capture.py examples/v8-suv/index.html shots [stage,stage,...] [--audit]
--audit: no pictures. It prints the audit of each stage at three instants, a few seconds in all. Use it while you fix things,
and take the pictures once at the end. With no stage list, every stage of the figure is used.
Needs: pip install playwright, and Chrome. three.js is served from node_modules when the CDN is not reachable."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

AUDIT = "--audit" in sys.argv
argv = [a for a in sys.argv if a != "--audit"]
page_path = os.path.abspath(argv[1])
out = os.path.abspath(argv[2] if len(argv) > 2 else "shots")
stages = [int(s) for s in argv[3].split(",")] if len(argv) > 3 else None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE = os.path.join(ROOT, "node_modules/three/build/three.min.js")
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")

async def main():
    os.makedirs(out, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
        pg = await b.new_page(viewport={"width": 820, "height": 860}, device_scale_factor=1 if AUDIT else 2)
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
        await pg.wait_for_timeout(2500)
        print("early errors:", errs)
        await pg.evaluate("fig.snap = true; fig.tourCfg = null")
        global stages
        if stages is None: stages = list(range(await pg.evaluate("document.querySelectorAll('[data-stage]').length") or 1))
        if AUDIT:
            # the same audit at three instants, so a label that hides only at some point of the motion still shows up
            bad = 0
            for s in stages:
                await pg.evaluate(f"window.setStage && setStage({s})")
                fl, hid, fail = set(), set(), set()
                for k in range(3):
                    await pg.wait_for_timeout(1300 if k == 0 else 450)
                    au = json.loads(await pg.evaluate("JSON.stringify(fig.audit())"))
                    fl |= set(au["floating"]); hid |= set(au["hiddenLabels"]); fail |= set(au["failedChecks"])
                bad += len(fl) + len(hid) + len(fail)
                print(f"stage {s}: floating {sorted(fl)}, hidden labels {sorted(hid)}, failed checks {sorted(fail)}")
            f = au["facts"]
            print(f"checks {au['checks']}, parts {au['parts']}, facts {f['total']} ({f['sourced']} sourced), unlinked {f['unlinked']}, no source {f['noSource']}")
            print("errors:", errs); print("CLEAN" if not bad and not errs else "NOT CLEAN")
            await b.close(); return
        for s in stages:
            await pg.evaluate(f"window.setStage && setStage({s})")
            await pg.wait_for_timeout(1800)
            box = await pg.evaluate("(()=>{const r=document.querySelector('#fig').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()")
            await pg.screenshot(path=os.path.join(out, f"stage{s}.png"), clip=box, animations="disabled")
            au = json.loads(await pg.evaluate("JSON.stringify(fig.audit())"))
            print(f"stage {s}: floating {au['floating']}, hidden labels {au['hiddenLabels']}, failed checks {au['failedChecks']}")
        # every lesson step, so the reviewer can check that each step shows what its text says
        if await pg.locator("[data-t=lesson]").count():
            await pg.click("[data-t=lesson]"); n = 0
            while True:
                await pg.wait_for_timeout(1800); n += 1
                await pg.screenshot(path=os.path.join(out, f"lesson{n}.png"), clip=box, animations="disabled")
                txt = await pg.inner_text(".mech-lesson .n")
                if txt.split()[1] == txt.split()[3] or n > 12: break
                await pg.click(".mech-lesson button[data-d='1']")
            await pg.click(".mech-lesson button[data-d='0']")
        extra = os.environ.get("EXTRA")
        if extra:
            for i, js in enumerate(extra.split(";;")):
                await pg.evaluate(js); await pg.wait_for_timeout(2200)
                await pg.screenshot(path=os.path.join(out, f"stage9{i}.png"), clip=box, animations="disabled")
        await pg.evaluate("window.setStage && setStage(0)"); await pg.wait_for_timeout(1500)
        full = await pg.evaluate("JSON.stringify(Object.assign(fig.audit(), { factList: fig.factList || [], described: fig.infoDict }))")
        open(os.path.join(out, "audit.json"), "w").write(full)
        au = json.loads(full); au.pop("factList"); au.pop("described")
        print("audit:", json.dumps(au))
        print("errors:", errs)
        await b.close()

asyncio.run(main())
