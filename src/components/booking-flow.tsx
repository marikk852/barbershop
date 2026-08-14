"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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

interface Service {
  id: string;
  nameRu: string;
  nameRo: string;
  durationMin: number;
  priceCents: number;
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
  const tPrice = useTranslations("Price");

  const today = useMemo(() => todayInShopTz(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => today.slice(0, 7));
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [monthLoading, setMonthLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  // true, как только сетка времени хоть раз пришла для ТЕКУЩЕЙ даты — в
  // отличие от slots (который перезатирается при каждом перезапросе),
  // не сбрасывается обратно в false при смене набора услуг: держит шаг
  // "услуга" (см. serviceSection ниже) на экране постоянно, вместо
  // мерцания "пропал-появился" при каждом клике по чекбоксу услуги.
  const [slotsEverLoaded, setSlotsEverLoaded] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Порядок шагов: дата → время (сетка ещё без привязки к услугам) →
  // услуги (можно несколько сразу — одна запись = один визит на все).
  // Выбор персистится через смену даты (незачем переспрашивать то, что
  // от даты не зависит) — сбрасывается явно только вместе со всем
  // остальным при закрытии попапа (размонтирование).
  const [services, setServices] = useState<Service[] | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  function toggleService(sv: Service) {
    setSelectedServices((prev) => (prev.some((s) => s.id === sv.id) ? prev.filter((s) => s.id !== sv.id) : [...prev, sv]));
  }
  const totalDurationMin = useMemo(() => selectedServices.reduce((sum, s) => sum + s.durationMin, 0), [selectedServices]);
  const totalPriceCents = useMemo(() => selectedServices.reduce((sum, s) => sum + s.priceCents, 0), [selectedServices]);
  // true, если ранее выбранное время не пережило проверку по суммарной
  // длительности только что изменившегося набора услуг (см. эффект
  // слотов ниже).
  const [timeMismatch, setTimeMismatch] = useState(false);

  // Форма контакта — последний шаг, после даты+времени+услуги.
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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

  // Дата ЕСТЬ в зависимостях у сброса времени, набор услуг — только у
  // перезапроса слотов (см. lastDateRef ниже: различаем "дата
  // реально сменилась, время однозначно устарело" от "набор услуг
  // изменился, нужно ПРОВЕРИТЬ уже выбранное время, а не слепо
  // сбрасывать" — иначе любое изменение набора услуг после выбора
  // времени всегда сбрасывало бы это время, даже если оно прекрасно
  // влезает и по новой суммарной длительности).
  const lastDateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    const dateChanged = lastDateRef.current !== selectedDate;
    lastDateRef.current = selectedDate;
    const timeToVerify = dateChanged ? null : selectedTime;
    // slots/slotsEverLoaded обнуляем ТОЛЬКО при реальной смене даты —
    // старые данные для новой даты откровенно неверны, показывать их
    // (пусть и притушенными) нельзя. При смене НАБОРА УСЛУГ (dateChanged
    // = false) старые slots намеренно НЕ трогаем здесь — эффект ниже
    // просто подменит их на актуальные, когда придёт ответ; на экране
    // всё это время остаётся прежняя сетка (только слегка притушенная
    // через slotsLoading, см. JSX), без пропадания/появления секции.
    if (dateChanged) {
      setSelectedTime(null);
      setSlots(null);
      setSlotsEverLoaded(false);
    }
    // См. комментарий в эффекте месяца выше — тот же осознанный случай
    // (индикаторы состояния запроса, которому нет смысла ждать лишний
    // рендер).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeMismatch(false);
    setSlotsLoading(true);
    const url = selectedServices.length > 0
      ? `/api/booking/slots?date=${selectedDate}&serviceIds=${selectedServices.map((s) => s.id).join(",")}`
      : `/api/booking/slots?date=${selectedDate}`;
    fetch(url)
      .then((r) => r.json())
      .then((data: { slots: string[] }) => {
        if (cancelled) return;
        setSlots(data.slots);
        setSlotsEverLoaded(true);
        if (timeToVerify && !data.slots.includes(timeToVerify)) {
          // Уже выбранное время не влезает в суммарную длительность
          // только что изменившегося набора услуг — сбрасываем ЕГО, а
          // не сам набор: пользователь явно менял услуги последним,
          // логичнее попросить перевыбрать время из уже верной сетки.
          setSelectedTime(null);
          setTimeMismatch(true);
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedServices]);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedTime || selectedServices.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds: selectedServices.map((s) => s.id),
          date: selectedDate,
          time: selectedTime,
          clientName,
          clientPhone,
          clientEmail: clientEmail.trim() || undefined,
          notes,
        }),
      });
      if (!r.ok) {
        const errBody = (await r.json().catch(() => ({}))) as { error?: string };
        if (r.status === 409 && errBody.error === "slot no longer available") {
          // Мир успел измениться между тем, как открыли форму, и
          // отправкой — кто-то другой занял это же время. Сбрасываем
          // выбор времени и сразу перезапрашиваем сетку (та же дата и
          // набор услуг) — только что занятое время исчезнет из списка
          // само, без дополнительного действия от пользователя.
          setSelectedTime(null);
          setTimeMismatch(true);
          fetch(`/api/booking/slots?date=${selectedDate}&serviceIds=${selectedServices.map((s) => s.id).join(",")}`)
            .then((res) => res.json())
            .then((d: { slots: string[] }) => setSlots(d.slots));
          throw new Error(t("slotTaken"));
        }
        throw new Error(t("genericError"));
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (selectedDate) {
    return (
      <div className={styles.flow}>
        <button type="button" className={styles.back} onClick={() => setSelectedDate(null)}>
          ← {t("backToCalendar")}
        </button>
        <h3 className={styles.stepTitle}>{selectedDateLabel}</h3>

        {/* Только для самой первой загрузки этой даты (slots ещё null —
            показать нечего) — текст "Загрузка…". При последующих
            перезапросах (сменился набор услуг) slots уже не null, старая
            сетка остаётся на экране притушенной (.slotGridLoading), а не
            подменяется этим текстом — иначе секция дёргалась бы туда-сюда
            при каждом клике по чекбоксу услуги. */}
        {slotsLoading && slots === null && <p className={styles.hint}>{t("loading")}</p>}
        {slots && slots.length === 0 && <p className={styles.hint}>{t("noSlots")}</p>}
        {slots && slots.length > 0 && (
          <div className={`${styles.slotGrid} ${slotsLoading ? styles.slotGridLoading : ""}`}>
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                className={`${styles.slot} ${selectedTime === s ? styles.slotSelected : ""}`}
                aria-pressed={selectedTime === s}
                onClick={() => {
                  setSelectedTime(s);
                  setTimeMismatch(false);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Шаг "услуга" — виден, как только сетка времени хоть раз
            загрузилась (не обязательно строго ПОСЛЕ выбора времени: время
            остаётся кликабельным и здесь же, выше, весь этот период —
            тот же принцип "всё на виду, ничего не прячем за шагами", что
            и у самого календаря). Гейт — slotsEverLoaded, НЕ "slots.length
            > 0" (было раньше): тот пересчитывается при каждом изменении
            набора услуг и на миг становится false/пустым на время
            перезапроса — секция мигала бы "пропал-появился" при каждом
            клике по чекбоксу. Заодно чинит смежную ловушку: если добавление
            услуги обнуляет доступные слоты (суммарная длительность больше
            не влезает никуда), пользователь всё ещё видит список услуг и
            может СНЯТЬ услугу обратно, а не упирается в "нет времени" без
            способа исправить. Услуг можно выбрать несколько сразу — одна
            запись на весь набор, время проверяется по СУММЕ их
            длительности (см. эффект слотов выше). Пока не выбраны ОБА —
            время и хотя бы одна услуга — summary ниже не показывается. */}
        {slotsEverLoaded && (
          <div className={styles.serviceSection}>
            <h3 className={styles.stepTitle}>{t("pickService")}</h3>
            {timeMismatch && <p className={styles.mismatchNotice}>{t("timeMismatch")}</p>}
            {!services && (
              <div className={styles.serviceGrid}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={styles.serviceOptionSkeleton} />
                ))}
              </div>
            )}
            {services && (
              <div className={styles.serviceGrid}>
                {services.map((sv) => {
                  const isSelected = selectedServices.some((s) => s.id === sv.id);
                  return (
                    <button
                      key={sv.id}
                      type="button"
                      className={`${styles.serviceOption} ${isSelected ? styles.serviceOptionSelected : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => toggleService(sv)}
                    >
                      <span className={styles.serviceOptionMain}>
                        <span className={styles.serviceOptionCheck} aria-hidden="true">
                          <svg viewBox="0 0 12 12" fill="none">
                            <path d="M2 6.2l2.6 2.6L10 3" stroke="#111319" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span className={styles.serviceOptionName}>{locale === "ro" ? sv.nameRo : sv.nameRu}</span>
                      </span>
                      <span className={styles.serviceOptionMeta}>
                        {sv.durationMin} {tPrice("duration")} · {(sv.priceCents / 100).toLocaleString(locale === "ro" ? "ro-RO" : "ru-RU")}{" "}
                        {tPrice("currency")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedTime && selectedServices.length > 0 && !submitted && (
          <div className={styles.summary}>
            <div className={styles.summaryText}>
              {t("selectedLabel")} {selectedDateLabel}, {selectedTime} ·{" "}
              {selectedServices.map((s) => (locale === "ro" ? s.nameRo : s.nameRu)).join(" + ")} · {totalDurationMin}{" "}
              {tPrice("duration")} · {(totalPriceCents / 100).toLocaleString(locale === "ro" ? "ro-RO" : "ru-RU")} {tPrice("currency")}
            </div>
            <form className={styles.contactForm} onSubmit={handleSubmit}>
              <input
                className={styles.input}
                type="text"
                required
                placeholder={t("namePlaceholder")}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                autoComplete="name"
              />
              <input
                className={styles.input}
                type="tel"
                required
                placeholder={t("phonePlaceholder")}
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                autoComplete="tel"
              />
              <input
                className={styles.input}
                type="email"
                placeholder={t("emailPlaceholder")}
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                autoComplete="email"
              />
              <textarea
                className={styles.textarea}
                placeholder={t("notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
              {submitError && <p className={styles.mismatchNotice}>{submitError}</p>}
              <button type="submit" className={styles.continueBtn} disabled={submitting}>
                {submitting ? t("submitting") : t("submit")}
              </button>
            </form>
          </div>
        )}

        {submitted && (
          <div className={styles.summary}>
            <p className={styles.successTitle}>{t("successTitle")}</p>
            <p className={styles.hint}>{t("successText")}</p>
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

      {/* Самый первый заход (monthData ещё null, а не просто смена месяца) —
          сетка уже нарисована числами, но ВСЕ дни временно disabled (см.
          isDisabled: "до загрузки графика ничего не кликабельно"), а
          затемнение (.calGridLoading) само по себе легко прочитать как
          "тут пусто/сломано", особенно на холодном старте serverless-
          функции (Vercel), где первый запрос к /api/booking/month может
          занять пару секунд. Явный текст — та же подсказка, что и у
          загрузки времени ниже (t("loading")). Сетку не подменяем (нет
          дизайн-прыжка, когда данные придут) — просто подсказка сверху. */}
      {!monthData && <p className={styles.hint}>{t("loading")}</p>}
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
