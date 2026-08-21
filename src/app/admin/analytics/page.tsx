"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminFetch } from "@/lib/admin-context";
import { haptic } from "@/lib/telegram-webapp";
import styles from "../admin.module.css";

type Period = "day" | "week" | "month" | "year";

interface SeriesPoint {
  key: string;
  label: string;
  bookingsCount: number;
  revenueCents: number;
}
interface TopClient {
  phone: string;
  name: string;
  bookingsCount: number;
  revenueCents: number;
}
interface AnalyticsData {
  period: { type: Period; label: string; anchor: string; prevAnchor: string; nextAnchor: string };
  totals: { bookingsCount: number; clientsCount: number; newClientsCount: number; revenueCents: number };
  series: SeriesPoint[];
  topClients: TopClient[];
}

const PERIOD_LABEL: Record<Period, string> = { day: "День", week: "Неделя", month: "Месяц", year: "Год" };
const PERIODS: Period[] = ["day", "week", "month", "year"];

function money(cents: number): string {
  return `${(cents / 100).toLocaleString("ru-RU")} MDL`;
}

export default function AnalyticsPage() {
  const adminFetch = useAdminFetch();
  const [period, setPeriod] = useState<Period>("week");
  const [anchor, setAnchor] = useState<string | null>(null); // null = сервер сам берёт "сегодня"
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (p: Period, a: string | null) => {
      setError(null);
      const qs = new URLSearchParams({ period: p });
      if (a) qs.set("date", a);
      adminFetch(`/api/admin/analytics?${qs}`)
        .then(async (r) => {
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Ошибка загрузки");
          return r.json() as Promise<AnalyticsData>;
        })
        .then(setData)
        .catch((e: Error) => setError(e.message));
    },
    [adminFetch],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(period, anchor);
  }, [load, period, anchor]);

  function switchPeriod(p: Period) {
    if (p === period) return;
    haptic("light");
    setPeriod(p);
    setAnchor(null); // при смене вкладки — снова "текущий" период, не тащим анкор с предыдущей
    setData(null);
  }
  function navigate(dir: "prev" | "next") {
    if (!data) return;
    haptic("light");
    setAnchor(dir === "prev" ? data.period.prevAnchor : data.period.nextAnchor);
    setData(null);
  }

  const maxRevenue = data ? Math.max(1, ...data.series.map((s) => s.revenueCents)) : 1;

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Аналитика</h1>

      <div className={styles.periodSwitch}>
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className={`${styles.periodBtn} ${p === period ? styles.periodBtnActive : ""}`}
            onClick={() => switchPeriod(p)}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className={styles.periodNav}>
        <button type="button" className={styles.periodNavBtn} onClick={() => navigate("prev")} disabled={!data} aria-label="Предыдущий период">
          ‹
        </button>
        <span className={styles.periodLabel}>{data ? data.period.label : "…"}</span>
        <button type="button" className={styles.periodNavBtn} onClick={() => navigate("next")} disabled={!data} aria-label="Следующий период">
          ›
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!error && !data && <div className={styles.cardSkeleton} style={{ height: 260 }} />}

      {!error && data && (
        <>
          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{data.totals.bookingsCount}</div>
              <div className={styles.statLabel}>Записей</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{data.totals.clientsCount}</div>
              <div className={styles.statLabel}>Клиентов</div>
              {data.totals.newClientsCount > 0 && <div className={styles.statSub}>+{data.totals.newClientsCount} новых</div>}
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{(data.totals.revenueCents / 100).toLocaleString("ru-RU")}</div>
              <div className={styles.statLabel}>Доход, MDL</div>
            </div>
          </div>

          <div className={styles.chartCard}>
            {data.series.length === 0 ? (
              <div className={styles.chartEmpty}>{data.period.type === "day" ? "Выходной день" : "Нет данных"}</div>
            ) : (
              <>
                <div className={styles.chartBars}>
                  {data.series.map((s) => (
                    <div key={s.key} className={styles.chartBarWrap}>
                      <div
                        className={`${styles.chartBar} ${s.revenueCents === 0 ? styles.chartBarEmpty : ""}`}
                        style={{ height: `${Math.max(2, (s.revenueCents / maxRevenue) * 100)}%` }}
                        title={`${s.label}: ${s.bookingsCount} зап. · ${money(s.revenueCents)}`}
                      />
                    </div>
                  ))}
                </div>
                <div className={styles.chartLabels}>
                  {data.series.map((s) => (
                    <span key={s.key} className={styles.chartLabel}>
                      {s.label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <h2 className={styles.sectionTitle}>Топ клиентов (за всё время)</h2>
          {data.topClients.length === 0 ? (
            <p className={styles.hint}>Пока нет выполненных записей.</p>
          ) : (
            <div className={styles.leaderList}>
              {data.topClients.map((c, i) => (
                <div key={c.phone} className={styles.leaderRow}>
                  <span className={styles.leaderRank}>{i + 1}</span>
                  <span className={styles.leaderName}>{c.name}</span>
                  <span className={styles.leaderMeta}>
                    {c.bookingsCount} · {money(c.revenueCents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
