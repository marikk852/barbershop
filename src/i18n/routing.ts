import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ru", "ro", "en"],
  defaultLocale: "ru",
  // Русский без префикса ("/", "/price"), румынский и английский — с префиксом
  // ("/ro", "/ro/price", "/en", "/en/price").
  // Явно, а не по умолчанию библиотеки — чтобы поведение было понятно из кода.
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
