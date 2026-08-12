import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/routing";

const FALLBACK_W = 800;
const FALLBACK_H = 1000;

export default async function PortfolioPage() {
  const t = await getTranslations("Portfolio");
  const locale = (await getLocale()) as Locale;

  const items = await prisma.portfolioItem.findMany({
    orderBy: { order: "asc" },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 pb-16" style={{ paddingTop: "calc(var(--scene-h) + 2.5rem)" }}>
      <h1 className="font-serif text-3xl tracking-wide">{t("title")}</h1>

      {/* Masonry (CSS multi-column), не grid: реальные фото почти никогда
          не совпадают с фиксированной пропорцией ячейки — раньше cover их
          обрезал, а фикс на contain оставлял чёрные поля по бокам. Тут
          высота каждой карточки не задана — рендерится в свою настоящую
          пропорцию (реальные width/height из БД), ничего не обрезается и
          не зависит от hover. Тот же подход, что и в PortfolioFlow
          (попап поверх 3D-сцены) — см. content-flow.module.css. */}
      <div className="mt-10 columns-2 gap-3 sm:columns-3">
        {items.map((item) => {
          const caption = locale === "ro" ? item.captionRo : item.captionRu;
          return (
            <figure key={item.id} className="group relative mb-3 break-inside-avoid overflow-hidden rounded-md">
              {/* loading="eager" — см. тот же комментарий в portfolio-flow.tsx:
                  IntersectionObserver-based lazy loading ненадёжно
                  отрабатывает в узких вложенных скролл-контейнерах
                  (особенно Safari/WebKit), часть фото не подгружалась без
                  ручного скролла мимо них. Фото немного — грузим все сразу. */}
              <Image
                src={item.imageUrl}
                alt={caption ?? ""}
                width={item.width ?? FALLBACK_W}
                height={item.height ?? FALLBACK_H}
                sizes="(max-width: 640px) 50vw, 33vw"
                loading="eager"
                className="block h-auto w-full transition-transform duration-300 group-hover:scale-105"
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
