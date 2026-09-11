#!/usr/bin/env python3
"""Rasterise assets/logo.svg to 32 / 180 / 512 PNG favicons."""

from pathlib import Path

import cairosvg

ROOT = Path(__file__).resolve().parents[1]
SVG = ROOT / "assets" / "logo.svg"
OUT = ROOT / "assets"


def main():
    svg = SVG.read_bytes()
    for name, size in (
        ("favicon-32.png", 32),
        ("apple-touch-icon.png", 180),
        ("icon-512.png", 512),
    ):
        dest = OUT / name
        cairosvg.svg2png(bytestring=svg, write_to=str(dest), output_width=size, output_height=size)
        print("wrote", dest)


if __name__ == "__main__":
    main()
