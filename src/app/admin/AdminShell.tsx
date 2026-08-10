"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BookingIcon, BioIcon, PriceIcon, PortfolioIcon } from "@/components/nav-icons";
import { AdminAuthProvider } from "@/lib/admin-context";
import { useTelegramWebApp } from "@/lib/telegram-webapp";
import styles from "./admin.module.css";

const TABS = [
  { href: "/admin", label: "Заявки", Icon: BookingIcon },
  { href: "/admin/services", label: "Прайс", Icon: PriceIcon },
  { href: "/admin/portfolio", label: "Портфолио", Icon: PortfolioIcon },
  { href: "/admin/content", label: "Контент", Icon: BioIcon },
];

// Единая точка входа для ВСЕХ разделов /admin/* — авторизация (initData
// проверяется РОВНО здесь, один раз, дальше прокидывается через
// AdminAuthProvider, см. lib/admin-context.tsx) + нижняя навигация.
// Раньше эта логика (загрузка/не-в-Telegram/доступ-запрещён) жила
// внутри page.tsx заявок — при добавлении новых разделов пришлось бы
// копировать её в каждый, теперь она общая.
export function AdminShell({ children }: { children: ReactNode }) {
  const { checked, initData } = useTelegramWebApp();
  const pathname = usePathname();

  if (!checked) {
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

  return (
    <AdminAuthProvider initData={initData}>
      {children}
      <nav className={styles.nav}>
        {TABS.map(({ href, label, Icon }) => {
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
