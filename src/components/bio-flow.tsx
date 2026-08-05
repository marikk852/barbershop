"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import styles from "./content-flow.module.css";

interface BioData {
  bioRu: string;
  bioRo: string;
  address: string | null;
}

export function BioFlow() {
  const locale = useLocale();
  const [data, setData] = useState<BioData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bio")
      .then((r) => r.json())
      .then((d: BioData) => {
        if (!cancelled) setData(d);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return <p className={styles.hint}>…</p>;

  const bio = locale === "ro" ? data.bioRo : data.bioRu;

  return (
    <div className={styles.flow}>
      <p className={styles.paragraph}>{bio}</p>
      {data.address && <p className={styles.meta}>{data.address}</p>}
    </div>
  );
}
