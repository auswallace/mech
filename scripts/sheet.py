"""Tile stage screenshots into one contact sheet. Usage: python3 scripts/sheet.py shots"""
import sys, glob, os
from PIL import Image
d = sys.argv[1]; fs = sorted(glob.glob(os.path.join(d, "stage*.png"))) + sorted(glob.glob(os.path.join(d, "lesson*.png")))
ims = [Image.open(f) for f in fs]; ims = [im.crop((0, 50, im.width, int(im.width * 0.74))).resize((714, 714 * int(im.width * 0.74 - 50) // im.width)) for im in ims]
h = ims[0].height; W = Image.new("RGB", (1428, h * ((len(ims) + 1) // 2)), (18, 18, 18))
for i, im in enumerate(ims): W.paste(im, ((i % 2) * 714, (i // 2) * h))
W.save(os.path.join(d, "sheet.png")); print("wrote sheet")
