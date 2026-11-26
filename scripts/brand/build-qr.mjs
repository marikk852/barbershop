// QR-код на главную сайта с плиткой WK в центре — для раздела «QR-код
// сайта» в админке (Контент). Собирается один раз и лежит статикой:
//   node scripts/brand/build-qr.mjs
// Результат: public/brand/qr-wk.svg (вектор, для типографии) и
// public/brand/qr-wk.png (2048×2048).
//
// Уровень коррекции ошибок H (до ~30% модулей можно потерять) — плитка
// в центре закрывает ~7% площади, код уверенно читается. После сборки
// стоит проверить распознавание (см. комментарий в конце файла).
import { readFileSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";
import sharp from "sharp";

const URL = process.env.QR_URL ?? "https://wkondryabarber.shop";
const INK = "#0b0b0d";
const QUIET = 4; // обязательные пустые поля вокруг кода, в модулях

const qr = QRCode.create(URL, { errorCorrectionLevel: "H" });
const n = qr.modules.size;
const dark = (x, y) => qr.modules.get(y, x) === 1;

// Центральная зона под логотип (в модулях): белая подложка LOGO_BOX,
// внутри — плитка с отступом в 1 модуль.
const LOGO_BOX = 9;
const lo = Math.floor((n - LOGO_BOX) / 2), hi = lo + LOGO_BOX;
const inLogo = (x, y) => x >= lo && x < hi && y >= lo && y < hi;

let d = "";
for (let y = 0; y < n; y++) {
  for (let x = 0; x < n; x++) {
    if (!dark(x, y) || inLogo(x, y)) continue;
    // склеиваем подряд идущие тёмные модули строки в один прямоугольник
    let w = 1;
    while (x + w < n && dark(x + w, y) && !inLogo(x + w, y)) w++;
    d += `M${x + QUIET} ${y + QUIET}h${w}v1h-${w}z`;
    x += w - 1;
  }
}

const total = n + QUIET * 2;
const tileSvg = readFileSync("public/brand/wk-tile.svg", "utf8")
  .replace(/^<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "");
const tileVB = readFileSync("public/brand/wk-tile.svg", "utf8").match(/viewBox="([^"]+)"/)[1];
const t0 = lo + QUIET + 1, tSize = LOGO_BOX - 2;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="QR: ${URL}">
  <rect width="${total}" height="${total}" fill="#ffffff"/>
  <path d="${d}" fill="${INK}"/>
  <svg x="${t0}" y="${t0}" width="${tSize}" height="${tSize}" viewBox="${tileVB}" shape-rendering="geometricPrecision">${tileSvg}</svg>
</svg>
`;

writeFileSync("public/brand/qr-wk.svg", svg);
await sharp(Buffer.from(svg), { density: 1200 }).resize(2048, 2048, { kernel: "nearest" }).png().toFile("public/brand/qr-wk.png");
console.log(`ok: ${URL} — ${n}×${n} модулей, версия ${qr.version}`);

// Проверка распознавания (вне npm-зависимостей проекта), например:
//   python -m venv v && v/bin/pip install zxing-cpp pillow
//   v/bin/python -c "import zxingcpp,PIL.Image as I;print(zxingcpp.read_barcode(I.open('public/brand/qr-wk.png')).text)"
