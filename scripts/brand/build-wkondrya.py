"""Логотип W.KONDRYA BARBER для заставки сайта: векторизация исходника и
«траектории пера» для анимации отрисовки.

Исходник: scripts/brand/source/wkondrya-logo.png (красный на белом, от владельца).
Результат: src/components/wkondrya-logo.ts — контуры частей (заливка) и
осевые линии штрихов (по ним в заставке «ведётся перо», открывая контур
через <mask>).

Запуск (вне npm-зависимостей проекта):
  python3 -m venv /tmp/v && /tmp/v/bin/pip install potracer scikit-image pillow numpy
  /tmp/v/bin/python scripts/brand/build-wkondrya.py
"""
import json
from collections import deque
from pathlib import Path

import numpy as np
import potrace
from PIL import Image
from skimage import measure, morphology

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "scripts/brand/source/wkondrya-logo.png"
OUT = ROOT / "src/components/wkondrya-logo.ts"

im = np.array(Image.open(SRC).convert("RGBA")).astype(float)
ink = (im[..., 3] > 40) & (im[..., :3].mean(-1) < 200)
lab = measure.label(ink, connectivity=2)
regions = [r for r in measure.regionprops(lab) if r.area >= 30]


def find(pred):
    return [r for r in regions if pred(r)]


def bbox_x(r):
    return r.bbox[1]


wk = find(lambda r: r.area > 15000)[0]  # монограмма с росчерком
circle_top = find(lambda r: r.bbox[0] < 200 and r.bbox[3] < 700)[0]
circle_bot = find(lambda r: r.bbox[0] > 420 and r.bbox[2] > 650 and r.bbox[3] < 700)[0]
divider = find(lambda r: r.bbox[3] - r.bbox[1] < 15 and r.bbox[2] - r.bbox[0] > 200)[0]
top_line = sorted(find(lambda r: r.bbox[1] > 800 and 340 < r.bbox[0] < 440), key=bbox_x)  # W . K O N D R Y A
bottom_line = sorted(find(lambda r: r.bbox[1] > 800 and r.bbox[0] > 460), key=bbox_x)  # B A R B E R


def trace(mask: np.ndarray) -> str:
    """Контур маски -> SVG path (кривые Безье potrace)."""
    # potracer считает "залитыми" нулевые пиксели — инвертируем маску.
    bm = potrace.Bitmap(~mask)
    plist = bm.trace(turdsize=4, alphamax=1.0, opticurve=True, opttolerance=0.2)
    d = []
    for curve in plist:
        s = curve.start_point
        d.append(f"M{s.x:.1f} {s.y:.1f}")
        for seg in curve.segments:
            if seg.is_corner:
                d.append(f"L{seg.c.x:.1f} {seg.c.y:.1f}L{seg.end_point.x:.1f} {seg.end_point.y:.1f}")
            else:
                d.append(
                    f"C{seg.c1.x:.1f} {seg.c1.y:.1f} {seg.c2.x:.1f} {seg.c2.y:.1f} {seg.end_point.x:.1f} {seg.end_point.y:.1f}"
                )
        d.append("Z")
    return "".join(d)


def region_mask(r):
    return lab == r.label


# ---- «Перо»: путь по скелету между опорными точками ----------------------
def skeleton_path(mask: np.ndarray, waypoints):
    sk = morphology.skeletonize(mask)
    pts = np.argwhere(sk)  # (y, x)

    def snap(p):
        x, y = p
        i = np.argmin((pts[:, 0] - y) ** 2 + (pts[:, 1] - x) ** 2)
        return tuple(pts[i])

    def bfs(a, b):
        prev = {a: None}
        q = deque([a])
        while q:
            c = q.popleft()
            if c == b:
                break
            y, x = c
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    n = (y + dy, x + dx)
                    if n not in prev and 0 <= n[0] < sk.shape[0] and 0 <= n[1] < sk.shape[1] and sk[n]:
                        prev[n] = c
                        q.append(n)
        path, c = [], b
        while c is not None:
            path.append(c)
            c = prev.get(c)
        return path[::-1]

    full = []
    snapped = [snap(w) for w in waypoints]
    for a, b in zip(snapped, snapped[1:]):
        seg = bfs(a, b)
        full.extend(seg if not full else seg[1:])
    # прореживаем (каждый 6-й пиксель) и сглаживаем скользящим средним
    arr = np.array([(x, y) for y, x in full], float)
    k = 5
    if len(arr) > 2 * k:
        sm = arr.copy()
        for i in range(k, len(arr) - k):
            sm[i] = arr[i - k : i + k + 1].mean(0)
        arr = sm
    arr = arr[:: 6].tolist() + [arr[-1].tolist()]
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in arr)


wk_mask = region_mask(wk)
PEN = {
    # W: от левого кончика росчерка — петля сверху, вниз, вверх, вниз, вверх
    "w": skeleton_path(wk_mask, [(92, 485), (300, 335), (345, 326), (258, 545), (398, 402), (376, 500), (508, 368)]),
    # стойка K — сверху вниз
    "kStem": skeleton_path(wk_mask, [(588, 273), (500, 420), (411, 600)]),
    # ветки K: верхняя ветка к центру, нога и хвост вправо
    "kArm": skeleton_path(wk_mask, [(700, 341), (497, 436), (650, 548), (893, 515)]),
}
circle_mask = region_mask(circle_top) | region_mask(circle_bot)
CIRCLE = {
    # одним движением: от правого конца верхней дуги против часовой стрелки
    "top": skeleton_path(region_mask(circle_top), [(676, 312), (420, 152), (156, 395)]),
    "bottom": skeleton_path(region_mask(circle_bot), [(155, 432), (400, 682), (642, 580)]),
}

data = {
    "viewBox": "80 140 1620 560",
    "wk": trace(wk_mask),
    "circle": trace(circle_mask),
    "divider": trace(region_mask(divider)),
    "dividerLine": f"M{(divider.bbox[1] + divider.bbox[3]) / 2:.1f} {divider.bbox[0]} L{(divider.bbox[1] + divider.bbox[3]) / 2:.1f} {divider.bbox[2]}",
    "title": [trace(region_mask(r)) for r in top_line],
    "subtitle": [trace(region_mask(r)) for r in bottom_line],
    "pen": PEN,
    "circlePen": CIRCLE,
}

OUT.write_text(
    "// СГЕНЕРИРОВАНО scripts/brand/build-wkondrya.py из scripts/brand/source/wkondrya-logo.png — не править руками.\n"
    f"export const WKONDRYA = {json.dumps(data, ensure_ascii=False)} as const;\n"
)
print("ok:", OUT, f"title letters={len(top_line)}", f"subtitle letters={len(bottom_line)}")
