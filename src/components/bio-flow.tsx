"use client";

import { useEffect, useState } from "react";
import type { SVGProps } from "react";
import { useLocale, useTranslations } from "next-intl";
import styles from "./content-flow.module.css";

interface BioData {
  bioRu: string;
  bioRo: string;
  address: string | null;
  phone: string | null;
  instagram: string | null;
  telegramUsername: string | null;
}

// Тот же язык иконок, что и nav-icons.tsx (viewBox 24x24, только stroke,
// без заливок) — эти три специфичны для бейджей контактов в биографии,
// отдельного общего набора под них в проекте нет.
const iconBase: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function PinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}
function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M6.6 3.5h3l1.4 4.4-2.1 1.7a13.5 13.5 0 0 0 5.5 5.5l1.7-2.1 4.4 1.4v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 5.1 5.1a1.5 1.5 0 0 1 1.5-1.6Z" />
    </svg>
  );
}
function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function TelegramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M20.5 4.2 3.3 11c-1 .4-1 1.4 0 1.8l4.3 1.4 1.6 4.9c.3.9 1.3 1 1.9.3l2.3-2.5 4.3 3.2c.8.6 1.9.2 2.1-.8l2.5-12.7c.2-1-.7-1.9-1.8-1.4Z" />
      <path d="M8 13.3l9.5-6.6-7.6 7.9" />
    </svg>
  );
}

export function BioFlow() {
  const locale = useLocale();
  const t = useTranslations("Bio");
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

  if (!data) {
    return (
      <div className={styles.bioSkeleton}>
        <span className={styles.skeletonLine} style={{ width: "94%" }} />
        <span className={styles.skeletonLine} style={{ width: "89%" }} />
        <span className={styles.skeletonLine} style={{ width: "72%" }} />
        <span className={styles.skeletonLine} style={{ width: "38%", marginTop: 10 }} />
      </div>
    );
  }

  const bio = locale === "ro" ? data.bioRo : data.bioRu;
  const instagramHandle = data.instagram?.replace(/^@/, "");
  const telegramHandle = data.telegramUsername?.replace(/^@/, "");
  const hasContacts = data.address || data.phone || instagramHandle || telegramHandle;

  return (
    <div className={styles.flow}>
      <span className={styles.bioMark} aria-hidden="true">
        “
      </span>
      <p className={styles.paragraph}>{bio}</p>

      {hasContacts && (
        <div className={styles.contactRow}>
          {data.address && (
            <span className={styles.badge}>
              <PinIcon />
              {data.address}
            </span>
          )}
          {data.phone && (
            <a className={styles.badge} href={`tel:${data.phone.replace(/[^\d+]/g, "")}`} aria-label={t("call")}>
              <PhoneIcon />
              {data.phone}
            </a>
          )}
          {instagramHandle && (
            <a
              className={styles.badge}
              href={`https://instagram.com/${instagramHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("instagram")}
            >
              <InstagramIcon />@{instagramHandle}
            </a>
          )}
          {telegramHandle && (
            <a
              className={styles.badge}
              href={`https://t.me/${telegramHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("telegram")}
            >
              <TelegramIcon />@{telegramHandle}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
