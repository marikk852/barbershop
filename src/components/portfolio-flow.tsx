"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import styles from "./content-flow.module.css";

interface PortfolioItem {
  id: string;
  imageUrl: string;
  captionRu: string | null;
  captionRo: string | null;
}

export function PortfolioFlow() {
  const locale = useLocale();
  const [items, setItems] = useState<PortfolioItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((d: { items: PortfolioItem[] }) => {
        if (!cancelled) setItems(d.items);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items) {
    return (
      <div className={styles.portfolioGrid}>
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className={styles.portfolioSkeleton} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.portfolioGrid}>
      {items.map((item) => {
        const caption = locale === "ro" ? item.captionRo : item.captionRu;
        return (
          <figure key={item.id} className={styles.portfolioItem}>
            {/* loading="eager", не дефолтный lazy: сетка скроллится ВНУТРИ
                своего контейнера (.portfolioGrid — overflow-y: auto), а не
                вместе со страницей — IntersectionObserver-based ленивая
                подгрузка ненадёжно отрабатывает во вложенном скролл-
                контейнере (особенно в Safari/WebKit), часть фото просто не
                подгружалась, пока пользователь не проскроллит мимо них.
                Фото немного (десяток-полтора) — грузим все сразу при
                открытии, а не по мере скролла. */}
            <Image src={item.imageUrl} alt={caption ?? ""} fill sizes="33vw" loading="eager" className={styles.portfolioImg} />
            {caption && <figcaption className={styles.portfolioCaption}>{caption}</figcaption>}
          </figure>
        );
      })}
    </div>
  );
}
