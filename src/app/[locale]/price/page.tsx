import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/routing";

export default async function PricePage() {
  const t = await getTranslations("Price");
  const locale = (await getLocale()) as Locale;

  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-serif text-3xl tracking-wide">{t("title")}</h1>

      <ul className="mt-10 divide-y divide-white/10">
        {services.map((s) => (
          <li key={s.id} className="flex items-baseline justify-between gap-4 py-5">
            <div>
              <div className="text-lg">{locale === "ro" ? s.nameRo : s.nameRu}</div>
              <div className="mt-1 text-sm text-zinc-500">
                {s.durationMin} {t("duration")}
              </div>
            </div>
            <div className="whitespace-nowrap font-serif text-lg text-zinc-100">
              {(s.priceCents / 100).toLocaleString(locale === "ro" ? "ro-RO" : "ru-RU")}{" "}
              <span className="text-sm text-zinc-500">{t("currency")}</span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
