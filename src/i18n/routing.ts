import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ru", "ro"],
  defaultLocale: "ru",
  // Русский без префикса ("/", "/price"), румынский с префиксом ("/ro", "/ro/price").
  // Явно, а не по умолчанию библиотеки — чтобы поведение было понятно из кода.
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
