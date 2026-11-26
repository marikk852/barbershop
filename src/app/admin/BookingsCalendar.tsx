"use client";

import { useEffect, useMemo, useState } from "react";
import { SHOP_TIMEZONE, localWeekday, parseDateStr, formatDateStr, todayInShopTz, zonedTimeToUtc } from "@/lib/shop-time";
import styles from "./calendar.module.css";

// Календарь записей в админке — по образцу календаря кабинета Zilora
// (~/rezo, app/[slug]/dashboard/calendar + components/DayTimeline.tsx):
// вид "день"/"неделя", шкала времени слева, сетка по STEP_MIN минут,
// записи — блоки с цветной полосой по статусу, нерабочее время и
// блокировки заштрихованы, красная линия "сейчас". Тап по свободной
// ячейке — ручная запись на это время, тап по записи — карточка с
// действиями. Отменённые записи в календаре не показываются (время
// свободно) — они остаются во вкладке "Список".

const STEP_MIN = 30;
const PX_PER_MIN = 1.6;

export type CalStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "DONE";

export interface CalBooking {
  id: string;
  clientName: string;
  clientPhone: string | null;
  startsAt: string;
  endsAt: string;
  status: CalStatus;
  notes: string | null;
  services: { nameRu: string; durationMin: number; priceCents: number }[];
}
export interface CalWorkingHours {
  weekday: number;
  startMinute: number;
  endMinute: number;
  closed: boolean;
}
export interface CalTimeOff {
  id: string;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
}

const STATUS_META: Record<Exclude<CalStatus, "CANCELLED">, { label: string; icon: string; cls: string }> = {
  PENDING: { label: "Ожидает", icon: "…", cls: styles.bPending },
  CONFIRMED: { label: "Подтверждена", icon: "●", cls: styles.bConfirmed },
  DONE: { label: "Выполнена", icon: "✓", cls: styles.bDone },
};

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHOP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
// Дата (YYYY-MM-DD) и минуты от полуночи — в часовом поясе барбершопа,
// а не телефона барбера.
function toShopLocal(d: Date): { date: string; min: number } {
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}
function addDays(dateStr: string, n: number): string {
  const { y, m, d } = parseDateStr(dateStr);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return formatDateStr(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
const dayTitleFmt = new Intl.DateTimeFormat("ru", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const dayLongFmt = new Intl.DateTimeFormat("ru", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
function utcNoon(dateStr: string) {
  const { y, m, d } = parseDateStr(dateStr);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

interface Placed {
  b: CalBooking;
  startMin: number;
  endMin: number;
}

export function BookingsCalendar({
  bookings,
  hours,
  timeOff,
  pendingId,
  onCreateAt,
  onStatus,
}: {
  bookings: CalBooking[];
  hours: CalWorkingHours[] | null;
  timeOff: CalTimeOff[] | null;
  pendingId: string | null;
  onCreateAt: (date: string, time: string) => void;
  onStatus: (id: string, status: CalStatus) => void;
}) {
  const today = todayInShopTz();
  const [date, setDate] = useState(today);
  const [week, setWeek] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [nowMin, setNowMin] = useState(() => toShopLocal(new Date()).min);

  // Линия "сейчас" — обновляем раз в минуту.
  useEffect(() => {
    const t = setInterval(() => setNowMin(toShopLocal(new Date()).min), 60_000);
    return () => clearInterval(t);
  }, []);

  const dates = useMemo(() => {
    if (!week) return [date];
    const monday = addDays(date, -((localWeekday(date) + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [date, week]);

  // Записи по дням (в поясе барбершопа), без отменённых.
  const byDate = useMemo(() => {
    const map = new Map<string, Placed[]>();
    for (const b of bookings) {
      if (b.status === "CANCELLED") continue;
      const s = new Date(b.startsAt);
      const { date: d, min } = toShopLocal(s);
      const dur = Math.max(STEP_MIN / 2, Math.round((new Date(b.endsAt).getTime() - s.getTime()) / 60000));
      const list = map.get(d) ?? [];
      list.push({ b, startMin: min, endMin: min + dur });
      map.set(d, list);
    }
    return map;
  }, [bookings]);

  const hoursFor = (d: string) => {
    const wh = hours?.find((h) => h.weekday === localWeekday(d));
    return wh && !wh.closed ? wh : null;
  };

  // Блокировки времени, обрезанные по границам каждого дня.
  const offFor = (d: string): { startMin: number; endMin: number }[] => {
    if (!timeOff) return [];
    const dayStart = zonedTimeToUtc(d, 0).getTime();
    const dayEnd = zonedTimeToUtc(d, 24 * 60).getTime();
    return timeOff
      .map((t) => ({ s: new Date(t.startsAt).getTime(), e: new Date(t.endsAt).getTime() }))
      .filter((t) => t.s < dayEnd && t.e > dayStart)
      .map((t) => ({
        startMin: Math.max(0, Math.round((t.s - dayStart) / 60000)),
        endMin: Math.min(24 * 60, Math.round((t.e - dayStart) / 60000)),
      }));
  };

  // Диапазон шкалы: рабочие часы показанных дней + записи вне них,
  // округлённо до часа. Если всё выходные — 9:00–20:00.
  const range = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const d of dates) {
      const wh = hours?.find((h) => h.weekday === localWeekday(d) && !h.closed);
      if (wh) {
        lo = Math.min(lo, wh.startMinute);
        hi = Math.max(hi, wh.endMinute);
      }
      for (const p of byDate.get(d) ?? []) {
        lo = Math.min(lo, p.startMin);
        hi = Math.max(hi, p.endMin);
      }
    }
    if (!Number.isFinite(lo)) {
      lo = 9 * 60;
      hi = 20 * 60;
    }
    return { startMin: Math.floor(lo / 60) * 60, endMin: Math.min(24 * 60, Math.ceil(hi / 60) * 60) };
  }, [dates, hours, byDate]);

  const heightPx = (range.endMin - range.startMin) * PX_PER_MIN;
  const hourMarks: number[] = [];
  for (let m = range.startMin; m <= range.endMin; m += 60) hourMarks.push(m);

  const active = activeId ? bookings.find((b) => b.id === activeId) ?? null : null;
  const shift = week ? 7 : 1;
  const headerLabel = week
    ? `${dayTitleFmt.format(utcNoon(dates[0]))} – ${dayTitleFmt.format(utcNoon(dates[6]))}`
    : `${dayLongFmt.format(utcNoon(date))}${date === today ? " · сегодня" : ""}`;

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.segment} role="group" aria-label="Вид календаря">
          <button type="button" className={!week ? styles.segOn : ""} aria-pressed={!week} onClick={() => setWeek(false)}>
            День
          </button>
          <button type="button" className={week ? styles.segOn : ""} aria-pressed={week} onClick={() => setWeek(true)}>
            Неделя
          </button>
        </div>
        <div className={styles.navBtns}>
          <button type="button" aria-label="Назад" onClick={() => setDate(addDays(date, -shift))}>
            ‹
          </button>
          <button type="button" onClick={() => setDate(today)}>
            Сегодня
          </button>
          <button type="button" aria-label="Вперёд" onClick={() => setDate(addDays(date, shift))}>
            ›
          </button>
        </div>
      </div>
      <div className={styles.headerLabel}>{headerLabel}</div>

      <div className={styles.legend}>
        <span><i className={styles.lgConfirmed} />Подтверждена</span>
        <span><i className={styles.lgPending} />Ожидает</span>
        <span><i className={styles.lgDone} />Выполнена</span>
        <span className={styles.legendHint}>Тап по свободному времени — новая запись</span>
      </div>

      <div className={styles.scroller}>
        <div className={styles.grid}>
          <div className={styles.axis}>
            <div className={styles.colHead} />
            <div className={styles.axisBody} style={{ height: heightPx }}>
              {hourMarks.map((m) => (
                <span key={m} className={styles.axisLabel} style={{ top: (m - range.startMin) * PX_PER_MIN }}>
                  {m === range.startMin ? "" : hhmm(m)}
                </span>
              ))}
            </div>
          </div>

          {dates.map((d) => {
            const wh = hoursFor(d);
            const placed = byDate.get(d) ?? [];
            const offs = offFor(d);
            const cells: { min: number; working: boolean; busy: boolean; past: boolean }[] = [];
            for (let m = range.startMin; m < range.endMin; m += STEP_MIN) {
              const end = m + STEP_MIN;
              cells.push({
                min: m,
                working: !!wh && m >= wh.startMinute && end <= wh.endMinute,
                busy:
                  placed.some((p) => p.startMin < end && p.endMin > m) || offs.some((o) => o.startMin < end && o.endMin > m),
                past: d < today || (d === today && end <= nowMin),
              });
            }
            const showNow = d === today && nowMin >= range.startMin && nowMin < range.endMin;
            return (
              <div key={d} className={`${styles.col} ${week ? styles.colWeek : ""}`}>
                <div className={`${styles.colHead} ${d === today ? styles.colToday : ""}`}>
                  <span className={styles.colTitle}>{week ? dayTitleFmt.format(utcNoon(d)) : "Барбер"}</span>
                  <span className={styles.colSub}>{wh ? `${hhmm(wh.startMinute)}–${hhmm(wh.endMinute)}` : "Выходной"}</span>
                </div>
                <div className={styles.colBody} style={{ height: heightPx }}>
                  {cells.map((c) => {
                    const top = (c.min - range.startMin) * PX_PER_MIN;
                    const cls = `${styles.cell} ${c.min % 60 === 0 ? styles.hourLine : ""} ${c.working ? "" : styles.off}`;
                    if (c.busy || c.past) {
                      return <div key={c.min} aria-hidden className={cls} style={{ top, height: STEP_MIN * PX_PER_MIN }} />;
                    }
                    return (
                      <button
                        key={c.min}
                        type="button"
                        className={`${cls} ${styles.free}`}
                        style={{ top, height: STEP_MIN * PX_PER_MIN }}
                        aria-label={`Записать на ${hhmm(c.min)}${c.working ? "" : " (нерабочее время)"}`}
                        onClick={() => onCreateAt(d, hhmm(c.min))}
                      >
                        <span>+ {hhmm(c.min)}</span>
                      </button>
                    );
                  })}

                  {offs.map((o, i) => {
                    const s = Math.max(o.startMin, range.startMin);
                    const e = Math.min(o.endMin, range.endMin);
                    if (e <= s) return null;
                    return (
                      <div
                        key={`off-${i}`}
                        className={styles.timeOff}
                        style={{ top: (s - range.startMin) * PX_PER_MIN, height: (e - s) * PX_PER_MIN }}
                      >
                        Блокировка
                      </div>
                    );
                  })}

                  {placed.map(({ b, startMin, endMin }) => {
                    const meta = STATUS_META[b.status as Exclude<CalStatus, "CANCELLED">];
                    const top = (startMin - range.startMin) * PX_PER_MIN;
                    const height = Math.max((endMin - startMin) * PX_PER_MIN, 22);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        className={`${styles.block} ${meta.cls} ${activeId === b.id ? styles.blockActive : ""}`}
                        style={{ top, height }}
                        onClick={() => setActiveId(activeId === b.id ? null : b.id)}
                      >
                        <span className={styles.blockTitle}>
                          <span aria-label={meta.label}>{meta.icon}</span> {hhmm(startMin)} {b.clientName}
                        </span>
                        <span className={styles.blockSub}>{b.services.map((s) => s.nameRu).join(" + ")}</span>
                      </button>
                    );
                  })}

                  {showNow && <div className={styles.nowLine} style={{ top: (nowMin - range.startMin) * PX_PER_MIN }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {active && (
        <>
          <div className={styles.backdrop} onClick={() => setActiveId(null)} />
          <div className={styles.sheet} role="dialog" aria-label={`Запись: ${active.clientName}`}>
            <div className={styles.sheetHead}>
              <strong>{active.clientName}</strong>
              <button type="button" className={styles.sheetClose} aria-label="Закрыть" onClick={() => setActiveId(null)}>
                ×
              </button>
            </div>
            <div className={styles.sheetRow}>
              {dayLongFmt.format(utcNoon(toShopLocal(new Date(active.startsAt)).date))}, {hhmm(toShopLocal(new Date(active.startsAt)).min)}–
              {hhmm(toShopLocal(new Date(active.endsAt)).min)}
            </div>
            <div className={styles.sheetRow}>
              {active.services.map((s) => s.nameRu).join(" + ")} ·{" "}
              {(active.services.reduce((sum, s) => sum + s.priceCents, 0) / 100).toLocaleString("ru-RU")} MDL
            </div>
            {active.clientPhone ? (
              <a className={styles.sheetRow} href={`tel:${active.clientPhone.replace(/[^\d+]/g, "")}`}>
                {active.clientPhone}
              </a>
            ) : (
              <div className={`${styles.sheetRow} ${styles.muted}`}>Телефон не указан</div>
            )}
            {active.notes && <div className={`${styles.sheetRow} ${styles.muted}`}>{active.notes}</div>}
            <div className={styles.sheetActions}>
              {active.status === "PENDING" && (
                <button
                  type="button"
                  className={styles.actPrimary}
                  disabled={pendingId === active.id}
                  onClick={() => onStatus(active.id, "CONFIRMED")}
                >
                  Подтвердить
                </button>
              )}
              {active.status === "CONFIRMED" && (
                <button
                  type="button"
                  className={styles.actPrimary}
                  disabled={pendingId === active.id}
                  onClick={() => onStatus(active.id, "DONE")}
                >
                  Выполнена
                </button>
              )}
              {active.status !== "DONE" && (
                <button
                  type="button"
                  className={styles.actDanger}
                  disabled={pendingId === active.id}
                  onClick={() => {
                    onStatus(active.id, "CANCELLED");
                    setActiveId(null);
                  }}
                >
                  Отменить
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
