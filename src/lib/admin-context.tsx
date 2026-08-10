"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";

// initData подтверждён (checked+truthy) ровно один раз, в AdminShell,
// до того, как рендерятся страницы разделов — контекст просто
// прокидывает уже проверенное значение вниз, без повторной проверки
// "не в Telegram"/"загрузка" на каждой странице.
const InitDataContext = createContext<string | null>(null);

export function AdminAuthProvider({ initData, children }: { initData: string; children: ReactNode }) {
  return <InitDataContext.Provider value={initData}>{children}</InitDataContext.Provider>;
}

export function useInitData(): string {
  const value = useContext(InitDataContext);
  if (!value) {
    throw new Error("useInitData() must be used within <AdminAuthProvider> (see AdminShell.tsx)");
  }
  return value;
}

// Обёртка над fetch — сама прикладывает Authorization ко всем
// /api/admin/* запросам, единая точка вместо `Authorization: tma
// ${initData}` в каждой странице раздела.
export function useAdminFetch() {
  const initData = useInitData();
  return useCallback(
    (input: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `tma ${initData}`);
      return fetch(input, { ...init, headers });
    },
    [initData],
  );
}
