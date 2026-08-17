import type { Metadata } from "next";
import { Bodoni_Moda, Barlow_Condensed, PT_Sans_Narrow } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { SiteScene } from "@/components/site-scene";
import { LocaleClientProvider } from "@/components/locale-client-provider";
import "../globals.css";

// Оба словаря целиком (ru.json+ro.json, суммарно ~4.5KB) грузятся здесь
// ВСЕГДА, независимо от текущего URL-локаля — уходят клиенту как props
// LocaleClientProvider, чтобы мгновенный переключатель языка (см. этот
// компонент) мог сменить messages без похода на сервер/навигации.
async function loadAllMessages(): Promise<Record<Locale, Record<string, unknown>>> {
  const entries = await Promise.all(
    routing.locales.map(async (l) => [l, (await import(`../../messages/${l}.json`)).default] as const),
  );
  return Object.fromEntries(entries) as Record<Locale, Record<string, unknown>>;
}

// Корневой layout лежит под динамическим сегментом [locale] — так и
// задуман App Router для интернационализации: html/body объявляются здесь,
// а не в отдельном app/layout.tsx (его в проекте намеренно нет).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: "W Condrea Barber",
  description: "Barber · Chișinău",
};

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-bodoni",
});

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-barlow",
});

// Точечно для меню (подписи в доке, номера пунктов, кнопка "Пропустить")
// и попапов (кнопки, текст форм, основной контент — см. .module.css) —
// по прямой просьбе пользователя, НЕ замена --font-barlow целиком.
// cyrillic обязателен (в отличие от bodoni/barlow выше, которые грузят
// только latin — сайт-то в основном на русском): у PT Sans Narrow
// кириллица — не довесок, а часть исходного дизайна шрифта (ParaType,
// изначально рисовался под кириллицу/латиницу парой), без этого subset
// весь кириллический текст в местах применения тихо падал бы обратно на
// системный sans-serif, вся затея с шрифтом была бы не видна на RU-локали
// (дефолтной для сайта). Только 400/700 — единственные начертания, которые
// Google Fonts отдаёт для этого семейства.
const ptSansNarrow = PT_Sans_Narrow({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  variable: "--font-pt-sans-narrow",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const allMessages = await loadAllMessages();

  return (
    <html
      lang={locale}
      className={`${bodoni.variable} ${barlow.variable} ${ptSansNarrow.variable}`}
      // Браузерные расширения (кошельки типа Bybit и т.п.) дописывают свои
      // data-атрибуты в <html> ДО того, как React гидратируется — это не
      // баг сайта, но React честно предупреждает о рассинхронизации.
      // suppressHydrationWarning — официальный паттерн React именно для
      // этого случая (см. https://react.dev/link/hydration-mismatch).
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased">
        {/* Внешний provider — locale/messages строго от сервера/URL, не
            трогаем (нужен для SSR-гидратации и usePathname() внутри
            LocaleClientProvider). Внутренний (LocaleClientProvider) —
            то, что реально управляет отображаемым языком, меняется
            мгновенно кликом без навигации, см. подробный комментарий
            в этом компоненте. */}
        <NextIntlClientProvider>
          <LocaleClientProvider initialLocale={locale} messages={allMessages}>
            <SiteScene />
            {children}
          </LocaleClientProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
