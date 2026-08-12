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
  width: number | null;
  height: number | null;
}

// Дефолт для фото, у которых почему-то нет сохранённых размеров (загружены
// до появления width/height в схеме и ещё не прошли бэкафилл, либо клиент
// не смог их прочитать при загрузке) — портретная пропорция, типична для
// телефонных фото из барбершопа, не идеальна, но не ломает масонри-сетку.
const FALLBACK_W = 800;
const FALLBACK_H = 1000;

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
            {/* Без fill: каждое фото в своей настоящей пропорции (масонри,
                см. content-flow.module.css) — width/height тут только
                подсказка next/image для srcset, реальный видимый размер
                задаёт CSS (width:100%; height:auto на .portfolioImg).
                loading="eager" — сетка скроллится ВНУТРИ своего контейнера
                (overflow-y: auto), а не вместе со страницей;
                IntersectionObserver-based ленивая подгрузка ненадёжно
                отрабатывает во вложенном скролл-контейнере (особенно в
                Safari/WebKit) — часть фото не подгружалась, пока не
                проскроллить мимо них. Фото немного (десяток-полтора),
                грузим все сразу. */}
            <Image
              src={item.imageUrl}
              alt={caption ?? ""}
              width={item.width ?? FALLBACK_W}
              height={item.height ?? FALLBACK_H}
              sizes="33vw"
              loading="eager"
              className={styles.portfolioImg}
            />
            {caption && <figcaption className={styles.portfolioCaption}>{caption}</figcaption>}
          </figure>
        );
      })}
    </div>
  );
}
