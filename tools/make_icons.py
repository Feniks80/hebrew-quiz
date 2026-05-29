#!/usr/bin/env python3
"""Generate PWA icons: a blue rounded square with a white Hebrew alef.

Produces:
    icons/icon-192.png  (any-purpose)
    icons/icon-512.png  (any-purpose)
    icons/icon-512-maskable.png  (with safe area for Android adaptive icons)
    icons/favicon.png   (32x32)
"""
from __future__ import annotations
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, "icons")
os.makedirs(DST, exist_ok=True)

FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
BG_FROM = (37, 99, 235)    # #2563eb
BG_TO = (29, 78, 216)      # #1d4ed8
FG = (255, 255, 255)

def gradient(w, h):
    img = Image.new("RGB", (w, h))
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(BG_FROM[0] + (BG_TO[0] - BG_FROM[0]) * t)
        g = int(BG_FROM[1] + (BG_TO[1] - BG_FROM[1]) * t)
        b = int(BG_FROM[2] + (BG_TO[2] - BG_FROM[2]) * t)
        for x in range(w):
            img.putpixel((x, y), (r, g, b))
    return img

def rounded_mask(w, h, radius):
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
    return m

def draw_alef(size, safe_ratio=1.0):
    """Draw alef centred. safe_ratio<1 shrinks the glyph for maskable icons."""
    img = gradient(size, size).convert("RGBA")
    draw = ImageDraw.Draw(img)
    # font: scale to ~70% of glyph area
    target_h = int(size * 0.6 * safe_ratio)
    fnt = ImageFont.truetype(FONT_PATH, target_h)
    text = "א"  # alef
    # measure
    bbox = draw.textbbox((0, 0), text, font=fnt)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1]
    draw.text((x, y), text, font=fnt, fill=FG)
    return img

def save_rounded(img, path, radius_ratio=0.22):
    w, h = img.size
    bg = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask = rounded_mask(w, h, int(min(w, h) * radius_ratio))
    bg.paste(img, (0, 0), mask)
    bg.save(path, "PNG", optimize=True)

def save_square(img, path):
    img.save(path, "PNG", optimize=True)

if __name__ == "__main__":
    # 192 any-purpose, rounded
    save_rounded(draw_alef(192), os.path.join(DST, "icon-192.png"))
    # 512 any-purpose, rounded
    save_rounded(draw_alef(512), os.path.join(DST, "icon-512.png"))
    # 512 maskable: Android crops to circle/squircle, glyph must sit in 80% safe zone
    save_square(draw_alef(512, safe_ratio=0.72), os.path.join(DST, "icon-512-maskable.png"))
    # favicon
    save_rounded(draw_alef(64), os.path.join(DST, "favicon.png"))
    for f in sorted(os.listdir(DST)):
        p = os.path.join(DST, f)
        print(f"  {f}: {os.path.getsize(p)} B")
