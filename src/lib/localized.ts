// Выбор текста по языку сайта — единая точка для всех полей, которые в
// базе хранятся отдельно для каждого языка (nameRu/nameRo/nameEn,
// captionRu/…, bioRu/…). Английские поля появились позже остальных и могут
// быть пустыми — тогда показываем русский вариант (основной язык сайта).
// Файл без "server only" и без Prisma — используется и в клиентских
// компонентах.
import type { Locale } from "@/i18n/routing";

type Maybe = string | null | undefined;

export function pickLocalized(locale: string, v: { ru: Maybe; ro: Maybe; en?: Maybe }): string {
  const val = locale === "ro" ? v.ro : locale === "en" ? v.en : v.ru;
  return (val && val.trim()) || v.ru || "";
}

// Локаль Intl для чисел и дат.
export const INTL_LOCALE: Record<Locale, string> = { ru: "ru-RU", ro: "ro-RO", en: "en-GB" };

export function intlLocale(locale: string): string {
  return INTL_LOCALE[locale as Locale] ?? INTL_LOCALE.ru;
}
