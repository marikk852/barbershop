"use client";

import styles from "../admin.module.css";

// QR-код на главную сайта — для печати (визитки, наклейка на дверь,
// зеркало). Сами файлы статические, собираются скриптом
// scripts/brand/build-qr.mjs (адрес и логотип WK в центре), здесь — только
// превью и скачивание.
const SITE = "wkondryabarber.shop";
const FILES = [
  { path: "/brand/qr-wk.png", name: "wkondryabarber-qr.png", label: "Скачать PNG" },
  { path: "/brand/qr-wk.svg", name: "wkondryabarber-qr.svg", label: "Скачать SVG" },
];

function download(path: string, fileName: string) {
  const url = new URL(path, window.location.origin).toString();
  const tg = window.Telegram?.WebApp;
  // Внутри Telegram — нативный диалог сохранения (Bot API 8.0+). Вне его
  // (или в старом клиенте) — обычная ссылка на скачивание.
  if (tg?.downloadFile && tg.isVersionAtLeast?.("8.0")) {
    tg.downloadFile({ url, file_name: fileName });
    return;
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function SiteQrCard() {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>QR-код сайта</h2>
      <div className={styles.card}>
        {/* eslint-disable-next-line @next/next/no-img-element -- статичный SVG, оптимизация next/image не нужна */}
        <img
          src="/brand/qr-wk.svg"
          alt={`QR-код: ${SITE}`}
          width={220}
          height={220}
          style={{ display: "block", width: 220, height: 220, margin: "0 auto", borderRadius: 12, background: "#fff" }}
        />
        <p className={styles.hint} style={{ textAlign: "center", margin: "12px 0 0" }}>
          Ведёт на главную: {SITE}
          <br />
          SVG — для типографии (любой размер без потери качества), PNG — для печати дома и соцсетей.
        </p>
        <div className={styles.btnRow}>
          {FILES.map((f, i) => (
            <button
              key={f.path}
              type="button"
              className={i === 0 ? styles.primaryBtn : styles.secondaryBtn}
              onClick={() => download(f.path, f.name)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
