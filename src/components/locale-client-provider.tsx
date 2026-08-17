"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { usePathname, getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type Messages = NonNullable<ComponentProps<typeof NextIntlClientProvider>["messages"]>;

const LocaleSwitchContext = createContext<((locale: Locale) => void) | null>(null);

// Единственный потребитель сейчас — переключатель языка в site-scene.tsx.
// Отдельный хук вместо прямого useContext снаружи — привычный паттерн
// "явная ошибка вместо тихого null", если кто-то попробует вызвать вне
// провайдера (не должно случиться штатно, он оборачивает всё приложение
// в layout.tsx).
export function useLocaleSwitch(): (locale: Locale) => void {
  const ctx = useContext(LocaleSwitchContext);
  if (!ctx) {
    throw new Error("useLocaleSwitch должен вызываться внутри <LocaleClientProvider>");
  }
  return ctx;
}

// Смена языка БЕЗ навигации/перезагрузки страницы — по прямой просьбе
// пользователя. Раньше переключатель делал window.location.href (полная
// перезагрузка), а до того — next-intl useRouter().replace() (клиентский
// SPA-переход) — оба обходят один и тот же корень проблемы: SiteScene
// (site-scene.tsx) насквозь императивный компонент (Three.js-рендерер,
// ручные DOM-манипуляции, requestAnimationFrame-цикл) и не переживает
// unmount/remount, который App Router устраивает при переходе между
// разными [locale]-маршрутами (см. память проекта — там же живёт разбор
// самого краша, "NotFoundError: removeChild").
//
// Решение — держать ДВА вложенных NextIntlClientProvider:
//   1) ВНЕШНИЙ (в layout.tsx, как и был всегда) — locale/messages от
//      сервера, ровно по URL. Не трогаем — от него зависит корректная
//      SSR-гидратация первого рендера И usePathname()/getPathname() ниже
//      (им нужен URL-based локаль-контекст, не "текущий отображаемый").
//   2) ВНУТРЕННИЙ (этот компонент) — locale/messages из React-state,
//      меняется МГНОВЕННО кликом, без похода в App Router. SiteScene и
//      все попапы рендерятся ВНУТРИ него — значит их useTranslations()/
//      useLocale() видят новый язык сразу, без единого re-mount.
// URL-адрес всё равно обновляется (history.pushState — НЕ через
// next/navigation router, тот всегда бьёт по RSC-дереву) — чтобы обновление
// страницы/шаринг ссылки открывали правильную локаль; сам React-рендер
// эту смену URL не замечает и не перестраивается.
export function LocaleClientProvider({
  initialLocale,
  messages,
  children,
}: {
  initialLocale: Locale;
  messages: Record<Locale, Messages>;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  // usePathname() ЗДЕСЬ надёжен только на первый рендер: он читает
  // ВНЕШНИЙ provider/реальный маршрут App Router, а тот у нас после
  // первого же ручного history.pushState (см. эффект ниже) остаётся
  // "залипшим" на исходном URL — App Router сам pushState не делал,
  // значит не в курсе новой строки адреса, а next-intl вычисляет
  // "текущий" pathname/префикс ИМЕННО через состояние App Router, не
  // через сырой window.location. Проверено вживую (console.log):
  // при второй смене языка (ro -> ru) usePathname() вернул "/ro"
  // ВМЕСТО "/" — считал, что мы всё ещё на ro-маршруте, хотя реального
  // перехода не было. Поэтому берём это значение РОВНО ОДИН РАЗ, при
  // монтировании (useRef с ленивым инициализатором — второй и все
  // последующие рендеры initialValue игнорируют) — это корректный
  // locale-agnostic путь текущей страницы (работает и для прямых ссылок
  // вроде /bio, /ro/price, не только для домашней), и дальше он не
  // "протухает", т.к. в этом SPA сам путь реально не меняется — меняется
  // только язык.
  const basePathnameRef = useRef(usePathname());
  const pendingUrlRef = useRef<string | null>(null);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState((current) => {
      if (next === current) return current;
      pendingUrlRef.current = getPathname({ href: basePathnameRef.current, locale: next });
      return next;
    });
  }, []);

  // Синхронизация URL — ОТДЕЛЬНЫМ эффектом, не прямо в setLocale/onClick.
  // Первая попытка (history.pushState прямо в обработчике клика) давала
  // реальную React-ошибку в консоли: "Cannot update a component (Router)
  // while rendering a different component (LocaleClientProvider)" — у
  // App Router собственный патч над window.history (следит за URL, чтобы
  // usePathname()/useRouter() по всему приложению были в курсе), и
  // синхронный pushState в той же обёртке события, что и наш setState,
  // сталкивает два обновления в одном тике. useEffect запускает pushState
  // ПОСЛЕ коммита рендера — уже вне фазы рендера, конфликта нет.
  // Зависимость только от `locale` (не от pathname/pendingUrlRef) — эффект
  // срабатывает РОВНО на смену locale, читает то, что setLocale уже
  // посчитал и положил в ref, дальше сам себя не триггерит.
  useEffect(() => {
    if (pendingUrlRef.current && typeof window !== "undefined") {
      window.history.pushState(null, "", pendingUrlRef.current);
      pendingUrlRef.current = null;
    }
  }, [locale]);

  return (
    <LocaleSwitchContext.Provider value={setLocale}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleSwitchContext.Provider>
  );
}
