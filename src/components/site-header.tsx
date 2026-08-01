"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const links = [
  { href: "/booking", key: "booking" as const },
  { href: "/bio", key: "bio" as const },
  { href: "/price", key: "price" as const },
  { href: "/portfolio", key: "portfolio" as const },
];

export function SiteHeader() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-4">
        <Link
          href="/"
          className="font-serif text-lg tracking-wide text-zinc-100 hover:text-white"
        >
          W Condrea
        </Link>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm uppercase tracking-[0.14em]">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  active
                    ? "text-red border-b border-red pb-0.5"
                    : "text-zinc-400 hover:text-zinc-100"
                }
              >
                {t(l.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex gap-3 text-xs uppercase tracking-[0.14em] text-zinc-500">
          <Link
            href={pathname}
            locale="ru"
            className={locale === "ru" ? "text-zinc-100" : "hover:text-zinc-200"}
          >
            Ru
          </Link>
          <span aria-hidden>·</span>
          <Link
            href={pathname}
            locale="ro"
            className={locale === "ro" ? "text-zinc-100" : "hover:text-zinc-200"}
          >
            Ro
          </Link>
        </div>
      </div>
    </header>
  );
}
