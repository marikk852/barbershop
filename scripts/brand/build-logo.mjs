// Генератор логотипа WK (лигатура: W + K в виде раскрытой шаветты).
// Единственный источник геометрии — все SVG/PNG/ICO собираются отсюда:
//   node scripts/brand/build-logo.mjs
// Результат:
//   public/brand/wk-mark.svg      — знак для тёмного фона (белый, прозрачный фон)
//   public/brand/wk-mark-ink.svg  — знак для светлого фона (чёрный)
//   public/brand/wk-tile.svg      — плитка (красный квадрат) — иконки
//   public/brand/wk-tile-512.png, wk-tile-640.png (аватар бота), wk-email.png
//   src/app/icon.svg, src/app/apple-icon.png, src/app/favicon.ico
import { writeFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const RED = "#d81f26";
const STEEL = "#f4f6f8";
const INK = "#0b0b0d";

// ---- геометрия (единицы viewBox) ----
const TOP = 80, BASE = 560;          // линия верха/низа букв
const T = 92;                        // толщина штриха
const W_PTS = [[60, TOP], [228, BASE], [392, 190], [556, BASE], [724, TOP]];
const HANDLE = { x: 724 - T / 2, w: T }; // рукоять = стойка K, растёт из конца W
const PIVOT = [748, 330];            // ось шаветты
// Лезвие шаветты в локальных координатах (ось — в 0,0; x — вдоль лезвия,
// y<0 — обух, y>0 — режущая кромка). Прямой обух чуть расширяется к
// кончику, кончик со стороны обуха скруглён, со стороны кромки — острый
// угол; у оси — "пятка": узкая шейка, переходящая изгибом в кромку.
const BLADE = {
  angle: -55,
  // силуэт держателя + лезвия
  body: "M-8 -33 L272 -44 C300 -45 318 -30 318 -6 L322 50 L84 50 C58 50 44 30 22 28 L-8 28 Z",
  // фаска режущей кромки — сужается к пятке
  bevel: "M92 50 L322 50 L319.6 33 L106 39 Z",
  // шов между держателем и сменным лезвием
  seam: "M64 12 L300 9",
};
const TANG = { angle: 49, len: 286, h: 58 };
export const VIEWBOX = "0 40 1000 560"; // подобран по bbox (см. preview)

// Контур W как многоугольник: смещаем осевую ломаную на ±T/2, углы —
// пересечения смещённых прямых (miter). Острые углы, вылезающие за линии
// TOP/BASE, срезаются по этим линиям — концы штрихов плоские, как у шрифта.
const r1 = (n) => Math.round(n * 10) / 10;
function wOutline() {
  const P = W_PTS, h = T / 2;
  const seg = P.slice(0, -1).map((p, i) => {
    const dx = P[i + 1][0] - p[0], dy = P[i + 1][1] - p[1], L = Math.hypot(dx, dy);
    return { p, d: [dx / L, dy / L], n: [-dy / L, dx / L] };
  });
  const off = (s, k) => ({ p: [s.p[0] + s.n[0] * h * k, s.p[1] + s.n[1] * h * k], d: s.d });
  const atY = (l, y) => { const t = (y - l.p[1]) / l.d[1]; return [l.p[0] + l.d[0] * t, y]; };
  const cross = (a, b) => {
    const den = a.d[0] * b.d[1] - a.d[1] * b.d[0];
    const t = ((b.p[0] - a.p[0]) * b.d[1] - (b.p[1] - a.p[1]) * b.d[0]) / den;
    return [a.p[0] + a.d[0] * t, a.p[1] + a.d[1] * t];
  };
  const side = (k) => {
    const L = seg.map((s) => off(s, k));
    const out = [atY(L[0], TOP)];
    for (let i = 1; i < L.length; i++) {
      const m = cross(L[i - 1], L[i]);
      if (m[1] > BASE) out.push(atY(L[i - 1], BASE), atY(L[i], BASE));
      else if (m[1] < TOP) out.push(atY(L[i - 1], TOP), atY(L[i], TOP));
      else out.push(m);
    }
    out.push(atY(L[L.length - 1], TOP));
    return out;
  };
  const pts = [...side(1), ...side(-1).reverse()];
  return "M" + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(" L") + " Z";
}
const W_OUTLINE = wOutline();

function glyph({ fg, blade, edge, pivot, cut }) {
  // cut — цвет "прорезей" (паз рукояти, кольцо вокруг оси) — цвет фона.
  const [px, py] = PIVOT;
  return `
  <path d="${W_OUTLINE}" fill="${fg}"/>
  <rect x="${HANDLE.x}" y="${TOP}" width="${HANDLE.w}" height="${BASE - TOP}" fill="${fg}"/>
  <line x1="${HANDLE.x + HANDLE.w / 2}" y1="${TOP + 46}" x2="${HANDLE.x + HANDLE.w / 2}" y2="${BASE - 46}" stroke="${cut}" stroke-width="9" stroke-linecap="round"/>
  <g transform="translate(${px} ${py}) rotate(${TANG.angle})">
    <rect x="0" y="${-TANG.h / 2}" width="${TANG.len}" height="${TANG.h}" rx="${TANG.h / 2}" fill="${fg}"/>
  </g>
  <g transform="translate(${px} ${py}) rotate(${BLADE.angle})">
    <path d="${BLADE.body}" fill="${blade}"/>
    <path d="${BLADE.seam}" fill="none" stroke="${cut}" stroke-width="5" stroke-linecap="round"/>
    <path d="${BLADE.bevel}" fill="${edge}"/>
  </g>
  <circle cx="${px}" cy="${py}" r="36" fill="${cut}"/>
  <circle cx="${px}" cy="${py}" r="24" fill="${pivot}"/>`;
}

const svg = (vb, body, extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra}>${body}\n</svg>\n`;

// Знак (прозрачный фон). cut = цвет фона, на котором знак стоит.
const mark = svg(VIEWBOX, glyph({ fg: STEEL, blade: STEEL, edge: RED, pivot: RED, cut: INK }), ` role="img" aria-label="WK"`);
const markInk = svg(VIEWBOX, glyph({ fg: INK, blade: INK, edge: RED, pivot: RED, cut: "#ffffff" }), ` role="img" aria-label="WK"`);

// Плитка: квадрат 1024, знак по центру с полями.
function tile(size = 1024) {
  const [vx, vy, vw, vh] = VIEWBOX.split(" ").map(Number);
  const pad = size * 0.13, inner = size - pad * 2;
  const s = inner / vw;
  const ty = (size - vh * s) / 2;
  return svg(`0 0 ${size} ${size}`, `
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${RED}"/>
  <g transform="translate(${pad} ${ty}) scale(${s}) translate(${-vx} ${-vy})">${glyph({ fg: INK, blade: STEEL, edge: INK, pivot: STEEL, cut: RED })}
  </g>`);
}
const tileSvg = tile();
// Квадрат без скругления — для аватара бота (Telegram сам режет в круг).
const tileSquare = tileSvg.replace(/rx="[\d.]+"/, 'rx="0"');

mkdirSync("public/brand", { recursive: true });
writeFileSync("public/brand/wk-mark.svg", mark);
writeFileSync("public/brand/wk-mark-ink.svg", markInk);
writeFileSync("public/brand/wk-tile.svg", tileSvg);
writeFileSync("src/app/icon.svg", tileSvg);

const png = (s, size) => sharp(Buffer.from(s), { density: 300 }).resize(size, size).png().toBuffer();
writeFileSync("public/brand/wk-tile-512.png", await png(tileSvg, 512));
writeFileSync("public/brand/wk-bot-avatar-640.png", await png(tileSquare, 640));
writeFileSync("public/brand/wk-email.png", await png(tileSvg, 192));
writeFileSync("src/app/apple-icon.png", await png(tileSquare, 180));

// favicon.ico: PNG-в-ICO (16/32/48) — формат, который понимают все браузеры.
const sizes = [16, 32, 48];
const imgs = await Promise.all(sizes.map((s) => png(tileSvg, s)));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let off = head.length;
sizes.forEach((s, i) => {
  const e = 6 + i * 16;
  head.writeUInt8(s, e); head.writeUInt8(s, e + 1);
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(imgs[i].length, e + 8); head.writeUInt32LE(off, e + 12);
  off += imgs[i].length;
});
writeFileSync("src/app/favicon.ico", Buffer.concat([head, ...imgs]));

// Геометрия для анимированной заставки (site-scene.tsx) — генерируется
// отсюда же, чтобы заставка и статичный логотип не разъехались.
writeFileSync("src/components/wk-logo-geometry.ts", `// СГЕНЕРИРОВАНО scripts/brand/build-logo.mjs — не править руками.
export const WK = ${JSON.stringify({ TOP, BASE, T, W_PTS, HANDLE, PIVOT, BLADE, TANG, W_OUTLINE }, null, 2)} as const;
`);
console.log("ok");
