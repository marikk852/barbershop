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
            <Image src={item.imageUrl} alt={caption ?? ""} fill sizes="33vw" className={styles.portfolioImg} />
            {caption && <figcaption className={styles.portfolioCaption}>{caption}</figcaption>}
          </figure>
        );
      })}
    </div>
  );
}
