"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  formatDateStr,
  isDayFullyBlocked,
  todayInShopTz,
  type TimeOffRange,
  type WorkingHoursRow,
} from "@/lib/shop-time";
import styles from "./booking-flow.module.css";

interface MonthData {
  workingHours: WorkingHoursRow[];
  timeOff: TimeOffRange[];
}

type DayCell = { dateStr: string; day: number } | null;

// Понедельник первым (европейская раскладка недели), а не воскресенье —
// удобнее читается для RU/RO аудитории. weekday здесь — JS-конвенция
// (0=вс..6=сб, как WorkingHours.weekday); переводим в "сколько дней от
// понедельника".
function mondayIndex(jsWeekday: number) {
  return (jsWeekday + 6) % 7;
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function buildMonthGrid(month: string): DayCell[] {
  const [y, m] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const leading = mondayIndex(firstWeekday);
  const total = daysInMonth(y, m);
  const cells: DayCell[] = Array.from({ length: leading }, () => null);
  for (let d = 1; d <= total; d++) cells.push({ dateStr: formatDateStr(y, m, d), day: d });
  return cells;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function BookingFlow() {
  const locale = useLocale();
  const t = useTranslations("Booking");

  const today = useMemo(() => todayInShopTz(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => today.slice(0, 7));
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [monthLoading, setMonthLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Осознанное исключение из "не звать setState в эффекте напрямую":
    // это индикатор загрузки внешнего запроса (месяц сменился — старые
    // данные графика ещё видны, но уже нерелевантны, пока не придёт
    // ответ) — самому запросу нет смысла ждать лишний рендер.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMonthLoading(true);
    fetch(`/api/booking/month?month=${visibleMonth}`)
      .then((r) => r.json())
      .then((data: MonthData) => {
        if (!cancelled) setMonthData(data);
      })
      .finally(() => {
        if (!cancelled) setMonthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visibleMonth]);

  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    // См. комментарий в эффекте месяца выше — тот же осознанный случай.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlotsLoading(true);
    setSlots(null);
    setSelectedTime(null);
    fetch(`/api/booking/slots?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data: { slots: string[] }) => {
        if (!cancelled) setSlots(data.slots);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const grid = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const weekdayLabels = useMemo(() => {
    // Понедельник = 2026-08-03 (реальный понедельник) — просто опорная
    // дата, значение не используется, важен только день недели по кругу.
    const ref = new Date(Date.UTC(2026, 7, 3));
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ref);
      d.setUTCDate(ref.getUTCDate() + i);
      return fmt.format(d);
    });
  }, [locale]);

  const monthTitle = useMemo(() => {
    const [y, m] = visibleMonth.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(Date.UTC(y, m - 1, 1)),
    );
  }, [visibleMonth, locale]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return "";
    const [yy, mm, dd] = selectedDate.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", weekday: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(yy, mm - 1, dd)),
    );
  }, [selectedDate, locale]);

  const canGoPrev = shiftMonth(visibleMonth, -1) >= today.slice(0, 7);

  function isDisabled(dateStr: string) {
    if (dateStr < today) return true;
    if (!monthData) return true; // до загрузки графика ничего не кликабельно — не даём записаться мимо TimeOff/выходных
    return isDayFullyBlocked(dateStr, monthData.workingHours, monthData.timeOff);
  }

  if (selectedDate) {
    return (
      <div className={styles.flow}>
        <button type="button" className={styles.back} onClick={() => setSelectedDate(null)}>
          ← {t("backToCalendar")}
        </button>
        <h3 className={styles.stepTitle}>{selectedDateLabel}</h3>

        {slotsLoading && <p className={styles.hint}>{t("loading")}</p>}
        {!slotsLoading && slots && slots.length === 0 && <p className={styles.hint}>{t("noSlots")}</p>}
        {!slotsLoading && slots && slots.length > 0 && (
          <div className={styles.slotGrid}>
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                className={`${styles.slot} ${selectedTime === s ? styles.slotSelected : ""}`}
                aria-pressed={selectedTime === s}
                onClick={() => setSelectedTime(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {selectedTime && (
          <div className={styles.summary}>
            <div className={styles.summaryText}>
              {t("selectedLabel")} {selectedDateLabel}, {selectedTime}
            </div>
            <button type="button" className={styles.continueBtn} disabled title={t("continueSoon")}>
              {t("continueSoon")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.flow}>
      <h3 className={styles.stepTitle}>{t("pickDate")}</h3>
      <div className={styles.calHeader}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => setVisibleMonth((m) => shiftMonth(m, -1))}
          disabled={!canGoPrev}
          aria-label={t("prevMonth")}
        >
          ‹
        </button>
        <span className={styles.monthTitle}>{monthTitle}</span>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => setVisibleMonth((m) => shiftMonth(m, 1))}
          aria-label={t("nextMonth")}
        >
          ›
        </button>
      </div>

      <div className={styles.weekdays}>
        {weekdayLabels.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className={`${styles.calGrid} ${monthLoading ? styles.calGridLoading : ""}`}>
        {grid.map((cell, i) =>
          cell === null ? (
            <span key={`b${i}`} />
          ) : (
            <button
              key={cell.dateStr}
              type="button"
              className={styles.day}
              disabled={isDisabled(cell.dateStr)}
              onClick={() => setSelectedDate(cell.dateStr)}
            >
              {cell.day}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
