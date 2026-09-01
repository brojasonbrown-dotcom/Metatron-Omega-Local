#!/usr/bin/env python3
"""
METATRON Ω icon generator — the brand-true glyph, computed, not downloaded.

A phosphor-green torus ring on black (the engine's geometry: every stable
scale IS a torus), with a soft glow falloff. Writes a multi-size Windows
icon.ico (16..256) and a reference icon.png into build/.

Deterministic: pure math, no assets fetched, no randomness.
"""
import math
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "..", "build")
os.makedirs(BUILD, exist_ok=True)

SIZE = 512  # master render, downsampled into the .ico sizes (crisp edges)
BG = (2, 6, 4, 255)          # #020604 — the app's black
GREEN = (0, 230, 107)        # #00e66b — phosphor green
GREEN_SOFT = (120, 255, 190)


def render_master() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), BG)
    px = img.load()
    cx = cy = SIZE / 2
    R = SIZE * 0.33           # major radius of the ring
    sigma = SIZE * 0.014      # ring line sharpness (gaussian)
    node_r = SIZE * 0.05      # centre node radius
    node_sigma = SIZE * 0.02  # node glow
    for y in range(SIZE):
        for x in range(SIZE):
            d = math.hypot(x - cx, y - cy)
            # gaussian ring — crisp centreline, soft halo
            ring = math.exp(-((d - R) / sigma) ** 2)
            # centre node: solid core + glow
            node = math.exp(-(d / node_sigma) ** 2) * 0.6
            core = 1.0 if d <= node_r else 0.0
            a = min(1.0, ring * 0.95 + node + core)
            if a > 0.01:
                # colour: green at the halo, near-white at the brightest core
                heat = min(1.0, ring ** 2 + core)
                rr = int(GREEN[0] + (GREEN_SOFT[0] - GREEN[0]) * heat)
                gg = int(GREEN[1] + (GREEN_SOFT[1] - GREEN[1]) * heat)
                bb = int(GREEN[2] + (GREEN_SOFT[2] - GREEN[2]) * heat)
                base = px[x, y]
                px[x, y] = tuple(
                    int(base[i] * (1 - a) + c * a) for i, c in enumerate((rr, gg, bb))
                ) + (255,)
    return img


def main() -> None:
    master = render_master()
    png_path = os.path.join(BUILD, "icon.png")
    master.save(png_path)

    ico_path = os.path.join(BUILD, "icon.ico")
    sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    master.save(ico_path, format="ICO", sizes=sizes)
    print(f"icon written: {ico_path} (sizes {sizes})")
    print(f"reference:    {png_path}")


if __name__ == "__main__":
    main()
