import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/routing";

export default async function PortfolioPage() {
  const t = await getTranslations("Portfolio");
  const locale = (await getLocale()) as Locale;

  const items = await prisma.portfolioItem.findMany({
    orderBy: { order: "asc" },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 pb-16" style={{ paddingTop: "calc(var(--dock-h) + 2.5rem)" }}>
      <h1 className="font-serif text-3xl tracking-wide">{t("title")}</h1>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const caption = locale === "ro" ? item.captionRo : item.captionRu;
          return (
            <figure key={item.id} className="group relative aspect-[4/5] overflow-hidden">
              <Image
                src={item.imageUrl}
                alt={caption ?? ""}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {caption && (
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2 pt-6 text-xs text-zinc-200">
                  {caption}
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>
    </main>
  );
}
