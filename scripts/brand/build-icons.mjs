// Иконки сайта из логотипа W.KONDRYA (монограмма WK в круге):
//   node scripts/brand/build-icons.mjs
// Берёт контуры из src/components/wkondrya-logo.ts (их собирает
// scripts/brand/build-wkondrya.py из исходника владельца).
// Результат:
//   public/brand/wk-tile.svg (+ wk-tile-512.png) — плитка, она же центр QR (build-qr.mjs)
//   public/brand/wk-bot-avatar-640.png — аватар бота (квадрат, Telegram сам режет в круг)
//   public/brand/wk-email.png — логотип в письмах
//   src/app/icon.svg, src/app/apple-icon.png, src/app/favicon.ico
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const src = readFileSync("src/components/wkondrya-logo.ts", "utf8");
const L = JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1));

const BG = "#7d0a10"; // тёмно-красный исходного логотипа
const BG_HI = "#9c1219";
// Центр и радиус круга монограммы в координатах исходника. Плитка
// центрируется по кругу; росчерк хвоста K уходит за правый край — так и задумано.
const CX = 415, CY = 417, R = 266;
const HALF = R * 1.27;

// bold — утолщённые линии (обводка того же цвета) для мелких размеров:
// на 16–48 px тонкие росчерки монограммы иначе почти исчезают.
function tile({ size = 1024, radius = 0.22, bold = 0 } = {}) {
  const s = size / (HALF * 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="35%" cy="28%" r="85%">
      <stop offset="0" stop-color="${BG_HI}"/><stop offset="1" stop-color="${BG}"/>
    </radialGradient>
    <clipPath id="tileClip"><rect width="${size}" height="${size}" rx="${size * radius}"/></clipPath>
  </defs>
  <g clip-path="url(#tileClip)">
    <rect width="${size}" height="${size}" fill="url(#bg)"/>
    <g transform="translate(${size / 2} ${size / 2}) scale(${s}) translate(${-CX} ${-CY})" fill="#fff"${
      bold ? ` stroke="#fff" stroke-width="${bold}" stroke-linejoin="round"` : ""
    }>
      <path d="${L.wk}"/><path d="${L.circle}"/>
    </g>
  </g>
</svg>
`;
}

const tileSvg = tile();
const squareSvg = tile({ radius: 0 });
writeFileSync("public/brand/wk-tile.svg", tileSvg);
writeFileSync("src/app/icon.svg", tileSvg);

const png = (svg, size) => sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toBuffer();
writeFileSync("public/brand/wk-tile-512.png", await png(tileSvg, 512));
writeFileSync("public/brand/wk-bot-avatar-640.png", await png(squareSvg, 640));
writeFileSync("public/brand/wk-email.png", await png(tileSvg, 192));
writeFileSync("src/app/apple-icon.png", await png(squareSvg, 180));

// favicon.ico: PNG-в-ICO (16/32/48).
const sizes = [16, 32, 48];
const boldSvg = tile({ radius: 0.2, bold: 16 });
const imgs = await Promise.all(sizes.map((s) => png(boldSvg, s)));
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
console.log("ok");
