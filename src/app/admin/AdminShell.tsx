"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BookingIcon, BioIcon, PriceIcon, PortfolioIcon, AnalyticsIcon, UsersIcon } from "@/components/nav-icons";
import { AdminAuthProvider } from "@/lib/admin-context";
import { useTelegramWebApp } from "@/lib/telegram-webapp";
import styles from "./admin.module.css";

const BASE_TABS = [
  { href: "/admin", label: "Заявки", Icon: BookingIcon },
  { href: "/admin/analytics", label: "Аналитика", Icon: AnalyticsIcon },
  { href: "/admin/services", label: "Прайс", Icon: PriceIcon },
  { href: "/admin/portfolio", label: "Портфолио", Icon: PortfolioIcon },
  { href: "/admin/content", label: "Контент", Icon: BioIcon },
];
const USERS_TAB = { href: "/admin/users", label: "Доступ", Icon: UsersIcon };

type AccessState = { status: "loading" } | { status: "denied" } | { status: "granted"; isOwner: boolean };

// Единая точка входа для ВСЕХ разделов /admin/* — авторизация (initData
// проверяется РОВНО здесь, один раз, дальше прокидывается через
// AdminAuthProvider, см. lib/admin-context.tsx) + нижняя навигация.
//
// Проверка теперь двухступенчатая: сначала initData вообще есть (мы
// внутри Telegram), потом — реальный запрос к /api/admin/me, который
// сверяет аккаунт со списком допущенных (владелец либо ACTIVE в
// AdminUser, см. lib/telegram-auth.ts). Раньше вторая ступень
// отсутствовала: любой Telegram-пользователь видел nav и содержимое
// страниц, просто каждая страница по отдельности получала 401 от своих
// запросов. Теперь посторонний не видит вообще ничего, кроме сообщения
// "Доступ запрещён" — ни nav, ни структуры разделов.
export function AdminShell({ children }: { children: ReactNode }) {
  const { checked, initData } = useTelegramWebApp();
  const pathname = usePathname();
  const [access, setAccess] = useState<AccessState>({ status: "loading" });

  useEffect(() => {
    if (!initData) return;
    let cancelled = false;
    fetch("/api/admin/me", { headers: { Authorization: `tma ${initData}` } })
      .then(async (r) => {
        if (!r.ok) return { ok: false as const };
        const data = (await r.json()) as { isOwner: boolean };
        return { ok: true as const, isOwner: data.isOwner };
      })
      .then((result) => {
        if (cancelled) return;
        setAccess(result.ok ? { status: "granted", isOwner: result.isOwner } : { status: "denied" });
      })
      .catch(() => {
        if (!cancelled) setAccess({ status: "denied" });
      });
    return () => {
      cancelled = true;
    };
  }, [initData]);

  if (!checked || (initData && access.status === "loading")) {
    return <main className={styles.centerMsg}>Загрузка…</main>;
  }
  if (!initData) {
    return (
      <main className={styles.centerMsg}>
        Откройте эту страницу через кнопку бота в Telegram — напрямую в
        браузере она не работает (нужна авторизация через Telegram).
      </main>
    );
  }
  if (access.status !== "granted") {
    return (
      <main className={styles.centerMsg}>
        Доступ запрещён.
        <br />
        Попросите барбера выдать доступ вашему аккаунту в разделе
        «Доступ» админки.
      </main>
    );
  }

  const tabs = access.isOwner ? [...BASE_TABS, USERS_TAB] : BASE_TABS;

  return (
    <AdminAuthProvider initData={initData}>
      {children}
      <nav className={styles.nav}>
        {tabs.map(({ href, label, Icon }) => {
          // Заявки (/admin) — точное совпадение, иначе он был бы
          // "активным" на КАЖДОМ /admin/* пути (префикс общий у всех).
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}>
              <Icon />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </AdminAuthProvider>
  );
}
