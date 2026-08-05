"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import styles from "./content-flow.module.css";

interface Service {
  id: string;
  nameRu: string;
  nameRo: string;
  durationMin: number;
  priceCents: number;
}

export function PriceFlow() {
  const locale = useLocale();
  const t = useTranslations("Price");
  const [services, setServices] = useState<Service[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/price")
      .then((r) => r.json())
      .then((d: { services: Service[] }) => {
        if (!cancelled) setServices(d.services);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!services) return <p className={styles.hint}>…</p>;

  return (
    <ul className={styles.priceList}>
      {services.map((s) => (
        <li key={s.id} className={styles.priceRow}>
          <div>
            <div className={styles.priceName}>{locale === "ro" ? s.nameRo : s.nameRu}</div>
            <div className={styles.meta}>
              {s.durationMin} {t("duration")}
            </div>
          </div>
          <div className={styles.priceValue}>
            {(s.priceCents / 100).toLocaleString(locale === "ro" ? "ro-RO" : "ru-RU")}{" "}
            <span className={styles.meta}>{t("currency")}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
