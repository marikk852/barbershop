"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAdminFetch } from "@/lib/admin-context";
import { haptic } from "@/lib/telegram-webapp";
import styles from "../admin.module.css";

interface SiteContentData {
  bioRu: string;
  bioRo: string;
  phone: string | null;
  instagram: string | null;
  telegramUsername: string | null;
  address: string | null;
}

interface WorkingHoursRow {
  weekday: number;
  startMinute: number;
  endMinute: number;
  closed: boolean;
}

interface TimeOffItem {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

const WEEKDAY_LABELS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]; // 0=вс, как WorkingHours.weekday / JS Date#getDay

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function toLocalInputValue(iso: string): string {
  // datetime-local ожидает "YYYY-MM-DDTHH:mm" в ЛОКАЛЬНОМ времени браузера
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ContentPage() {
  const adminFetch = useAdminFetch();

  // --- био/контакты ---
  const [content, setContent] = useState<SiteContentData | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [savingContent, setSavingContent] = useState(false);

  // --- график работы ---
  const [hours, setHours] = useState<WorkingHoursRow[] | null>(null);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [savingHours, setSavingHours] = useState(false);

  // --- блокировки времени ---
  const [timeOff, setTimeOff] = useState<TimeOffItem[] | null>(null);
  const [timeOffError, setTimeOffError] = useState<string | null>(null);
  const [addingTimeOff, setAddingTimeOff] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({ startsAt: "", endsAt: "", reason: "" });
  const [savingTimeOff, setSavingTimeOff] = useState(false);
  const [busyTimeOffId, setBusyTimeOffId] = useState<string | null>(null);

  function loadAll() {
    setContentError(null);
    adminFetch("/api/admin/content")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Ошибка загрузки");
        return r.json() as Promise<{ content: SiteContentData }>;
      })
      .then((d) => setContent(d.content))
      .catch((e: Error) => setContentError(e.message));

    setHoursError(null);
    adminFetch("/api/admin/working-hours")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Ошибка загрузки");
        return r.json() as Promise<{ rows: WorkingHoursRow[] }>;
      })
      .then((d) => setHours([...d.rows].sort((a, b) => a.weekday - b.weekday)))
      .catch((e: Error) => setHoursError(e.message));

    setTimeOffError(null);
    adminFetch("/api/admin/time-off")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Ошибка загрузки");
        return r.json() as Promise<{ items: TimeOffItem[] }>;
      })
      .then((d) => setTimeOff(d.items))
      .catch((e: Error) => setTimeOffError(e.message));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleContentSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content) return;
    setContentError(null);
    setSavingContent(true);
    try {
      const r = await adminFetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Не удалось сохранить");
      haptic("success");
    } catch (err) {
      haptic("error");
      setContentError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSavingContent(false);
    }
  }

  function updateHourRow(weekday: number, patch: Partial<WorkingHoursRow>) {
    setHours((prev) => (prev ? prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)) : prev));
  }

  async function handleHoursSubmit() {
    if (!hours) return;
    setHoursError(null);
    setSavingHours(true);
    try {
      const r = await adminFetch("/api/admin/working-hours", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: hours }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Не удалось сохранить");
      haptic("success");
    } catch (err) {
      haptic("error");
      setHoursError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSavingHours(false);
    }
  }

  async function handleTimeOffSubmit(e: FormEvent) {
    e.preventDefault();
    setTimeOffError(null);
    if (!timeOffForm.startsAt || !timeOffForm.endsAt) {
      setTimeOffError("Укажите начало и конец блокировки.");
      return;
    }
    setSavingTimeOff(true);
    try {
      const r = await adminFetch("/api/admin/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: new Date(timeOffForm.startsAt).toISOString(),
          endsAt: new Date(timeOffForm.endsAt).toISOString(),
          reason: timeOffForm.reason || null,
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Не удалось добавить");
      haptic("success");
      setAddingTimeOff(false);
      setTimeOffForm({ startsAt: "", endsAt: "", reason: "" });
      loadAll();
    } catch (err) {
      haptic("error");
      setTimeOffError(err instanceof Error ? err.message : "Не удалось добавить");
    } finally {
      setSavingTimeOff(false);
    }
  }

  async function handleTimeOffDelete(item: TimeOffItem) {
    setBusyTimeOffId(item.id);
    try {
      const r = await adminFetch(`/api/admin/time-off/${item.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      haptic("success");
      setTimeOff((prev) => (prev ? prev.filter((x) => x.id !== item.id) : prev));
    } catch {
      haptic("error");
      setTimeOffError("Не удалось удалить блокировку.");
    } finally {
      setBusyTimeOffId(null);
    }
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Контент</h1>

      {/* --- Био и контакты --- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Биография и контакты</h2>
        {contentError && <p className={styles.error}>{contentError}</p>}
        {!content && !contentError && <div className={styles.cardSkeleton} style={{ height: 280 }} />}
        {content && (
          <form className={styles.card} onSubmit={handleContentSubmit}>
            <div className={styles.formRow}>
              <span className={styles.label}>О себе (рус.)</span>
              <textarea
                className={styles.textarea}
                style={{ minHeight: 100 }}
                value={content.bioRu}
                onChange={(e) => setContent((c) => (c ? { ...c, bioRu: e.target.value } : c))}
              />
              <span className={styles.label}>О себе (рум.)</span>
              <textarea
                className={styles.textarea}
                style={{ minHeight: 100 }}
                value={content.bioRo}
                onChange={(e) => setContent((c) => (c ? { ...c, bioRo: e.target.value } : c))}
              />
              <span className={styles.label}>Телефон</span>
              <input
                className={styles.input}
                value={content.phone ?? ""}
                onChange={(e) => setContent((c) => (c ? { ...c, phone: e.target.value } : c))}
                placeholder="+373 6XX XX XXX"
              />
              <span className={styles.label}>Instagram</span>
              <input
                className={styles.input}
                value={content.instagram ?? ""}
                onChange={(e) => setContent((c) => (c ? { ...c, instagram: e.target.value } : c))}
                placeholder="@username"
              />
              <span className={styles.label}>Telegram</span>
              <input
                className={styles.input}
                value={content.telegramUsername ?? ""}
                onChange={(e) => setContent((c) => (c ? { ...c, telegramUsername: e.target.value } : c))}
                placeholder="@username"
              />
              <span className={styles.label}>Адрес</span>
              <input
                className={styles.input}
                value={content.address ?? ""}
                onChange={(e) => setContent((c) => (c ? { ...c, address: e.target.value } : c))}
                placeholder="ул. …, Кишинёв"
              />
              <div className={styles.btnRow}>
                <button type="submit" className={styles.primaryBtn} disabled={savingContent}>
                  {savingContent ? "Сохраняем…" : "Сохранить"}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* --- График работы --- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>График работы</h2>
        {hoursError && <p className={styles.error}>{hoursError}</p>}
        {!hours && !hoursError && <div className={styles.cardSkeleton} style={{ height: 260 }} />}
        {hours && (
          <div className={styles.card}>
            {hours.map((row) => (
              <div key={row.weekday} className={styles.whRow}>
                <span className={styles.whDay}>{WEEKDAY_LABELS[row.weekday]}</span>
                <input
                  type="time"
                  className={styles.timeInput}
                  disabled={row.closed}
                  value={minutesToTime(row.startMinute)}
                  onChange={(e) => updateHourRow(row.weekday, { startMinute: timeToMinutes(e.target.value) })}
                />
                <input
                  type="time"
                  className={styles.timeInput}
                  disabled={row.closed}
                  value={minutesToTime(row.endMinute)}
                  onChange={(e) => updateHourRow(row.weekday, { endMinute: timeToMinutes(e.target.value) })}
                />
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={row.closed}
                    onChange={(e) => updateHourRow(row.weekday, { closed: e.target.checked })}
                  />
                  Вых.
                </label>
              </div>
            ))}
            <div className={styles.btnRow} style={{ marginTop: 14 }}>
              <button type="button" className={styles.primaryBtn} disabled={savingHours} onClick={handleHoursSubmit}>
                {savingHours ? "Сохраняем…" : "Сохранить график"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* --- Блокировки времени (отпуск/обед) --- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Блокировки времени</h2>
        {timeOffError && <p className={styles.error}>{timeOffError}</p>}

        {addingTimeOff && (
          <form className={styles.card} onSubmit={handleTimeOffSubmit} style={{ marginBottom: 12 }}>
            <div className={styles.formRow}>
              <span className={styles.label}>Начало</span>
              <input
                type="datetime-local"
                className={styles.input}
                value={timeOffForm.startsAt}
                onChange={(e) => setTimeOffForm((f) => ({ ...f, startsAt: e.target.value }))}
                required
              />
              <span className={styles.label}>Конец</span>
              <input
                type="datetime-local"
                className={styles.input}
                value={timeOffForm.endsAt}
                onChange={(e) => setTimeOffForm((f) => ({ ...f, endsAt: e.target.value }))}
                required
              />
              <input
                className={styles.input}
                placeholder="Причина (необязательно)"
                value={timeOffForm.reason}
                onChange={(e) => setTimeOffForm((f) => ({ ...f, reason: e.target.value }))}
              />
              <div className={styles.btnRow}>
                <button type="submit" className={styles.primaryBtn} disabled={savingTimeOff}>
                  {savingTimeOff ? "Сохраняем…" : "Добавить"}
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={savingTimeOff}
                  onClick={() => setAddingTimeOff(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </form>
        )}

        {!timeOff && !timeOffError && <div className={styles.cardSkeleton} style={{ height: 90 }} />}

        {timeOff && (
          <div className={styles.list}>
            {timeOff.length === 0 && !addingTimeOff && <p className={styles.hint}>Блокировок нет.</p>}
            {timeOff.map((item) => (
              <div key={item.id} className={styles.card}>
                <div className={styles.cardRow}>
                  {new Date(item.startsAt).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}
                  {" — "}
                  {new Date(item.endsAt).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}
                </div>
                {item.reason && <div className={styles.notes}>{item.reason}</div>}
                <div className={styles.btnRow} style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className={styles.dangerBtn}
                    disabled={busyTimeOffId === item.id}
                    onClick={() => handleTimeOffDelete(item)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!addingTimeOff && (
          <button
            type="button"
            className={styles.fab}
            onClick={() => {
              setTimeOffForm({ startsAt: toLocalInputValue(new Date().toISOString()), endsAt: "", reason: "" });
              setAddingTimeOff(true);
            }}
            aria-label="Добавить блокировку времени"
          >
            +
          </button>
        )}
      </section>
    </main>
  );
}
