"use client";

import { useEffect, useState } from "react";

// Минимальный срез Telegram WebApp SDK, который реально используется в
// админке — не тащим сторонний @telegram-apps/sdk ради десятка полей,
// сам telegram-web-app.js (см. admin/layout.tsx) уже кладёт этот объект
// в window глобально.
interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  colorScheme: "light" | "dark";
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

interface WebAppState {
  // false — ещё не проверяли (первый рендер, до эффекта, показываем
  // "загрузка"). true — проверили.
  checked: boolean;
  // initData ПУСТ не только когда window.Telegram вообще нет (скрипт не
  // загрузился), но и когда он ЕСТЬ, но страница открыта НЕ из настоящего
  // Telegram-клиента: сам telegram-web-app.js, загруженный в обычном
  // браузере, всё равно кладёт в window.Telegram.WebApp рабочую
  // "заглушку" (ready()/expand() существуют, просто ничего не делают по-
  // настоящему) — только initData у неё пустая строка. Раньше здесь
  // проверялось "webApp === null" (буквальное отсутствие объекта) — что
  // никогда не срабатывает в этом (самом частом при разработке/случайном
  // прямом заходе) сценарии, и страница вместо понятного сообщения молча
  // зависала на skeleton-заглушке навсегда (fetch не запускался, но и
  // ошибка не показывалась). Единственный надёжный сигнал "мы по-
  // настоящему внутри Telegram" — непустой initData.
  initData: string | null;
}

// Один хук на всю админку — вызывает ready()/expand() РОВНО один раз при
// монтировании (иначе повторные ready() в StrictMode/при перерендерах —
// безвредны по факту, но незачем звать лишний раз), отдаёт initData для
// авторизационного заголовка каждого запроса.
export function useTelegramWebApp(): WebAppState {
  const [state, setState] = useState<WebAppState>({ checked: false, initData: null });

  useEffect(() => {
    const webApp = window.Telegram?.WebApp ?? null;
    if (webApp) {
      webApp.ready();
      webApp.expand();
    }
    // Осознанное исключение из "не звать setState в эффекте напрямую":
    // window.Telegram — внешняя система (глобал, который кладёт сторонний
    // скрипт telegram-web-app.js), а не React-состояние; синхронизируем
    // его в state ровно один раз при монтировании, других источников
    // изменения нет.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ checked: true, initData: webApp?.initData || null });
  }, []);

  return state;
}

export function haptic(kind: "light" | "medium" | "success" | "error" = "light") {
  const hf = window.Telegram?.WebApp?.HapticFeedback;
  if (!hf) return;
  if (kind === "success" || kind === "error") hf.notificationOccurred(kind);
  else hf.impactOccurred(kind);
}
