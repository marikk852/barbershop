import type { Metadata } from "next";
import { Bodoni_Moda, Barlow_Condensed } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/site-header";
import "../globals.css";

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

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} className={`${bodoni.variable} ${barlow.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <NextIntlClientProvider>
          <SiteHeader />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
