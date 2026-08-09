import type { Metadata } from "next";
import Script from "next/script";
import "./admin-globals.css";

// Отдельный root layout — /admin НЕ является потомком src/app/[locale]/layout.tsx
// (тот держит html/body для публичного сайта с i18n; здесь своей i18n нет,
// это отдельная, не локализованная Telegram Mini App). См. proxy.ts —
// matcher явно исключает /admin из next-intl middleware.
export const metadata: Metadata = {
  title: "W Condrea Barber — Админка",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {/* beforeInteractive — must be in root layout per Next.js docs;
            это и есть корневой layout для этого поддерева. Скрипт кладёт
            window.Telegram.WebApp и CSS-переменные --tg-theme-* на html
            ДО гидратации, чтобы страница не мигала неверной темой. */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
