"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { SHOP_TIMEZONE, todayInShopTz } from "@/lib/shop-time";
import { useAdminFetch } from "@/lib/admin-context";
import { haptic } from "@/lib/telegram-webapp";
import styles from "./admin.module.css";

type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "DONE";
type BookingSource = "SITE" | "MANUAL";

interface Booking {
  id: string;
  clientName: string;
  // NULL — ручная запись без номера (уличный клиент часто его не
  // оставляет, см. POST ниже и schema.prisma). У онлайн-заявок с сайта
  // телефон всегда есть — форма на сайте его требует.
  clientPhone: string | null;
  clientEmail: string | null;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  source: BookingSource;
  notes: string | null;
  // Снимок на момент бронирования (см. BookingService в схеме) — не
  // текущие значения услуги, список может быть длиной 1 или больше.
  services: { nameRu: string; nameRo: string; durationMin: number; priceCents: number }[];
}

interface ServiceOption {
  id: string;
  nameRu: string;
  durationMin: number;
  priceCents: number;
  active: boolean;
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Ожидает подтверждения",
  CONFIRMED: "Подтверждена",
  CANCELLED: "Отменена",
  DONE: "Выполнена",
};

// Статусы, доступные при РУЧНОМ создании записи — ровно те же 4, что и
// у STATUS_LABEL выше (в отличие от ALLOWED_BOOKING_STATUSES в lib/
// booking-status.ts, тот список — только переходы ИЗ уже существующей
// записи, PENDING туда не входит осознанно; при создании же PENDING
// вполне уместен — "клиент позвонил, предварительно записал").
const CREATE_STATUS_OPTIONS: BookingStatus[] = ["DONE", "CONFIRMED", "PENDING", "CANCELLED"];

const dateFmt = new Intl.DateTimeFormat("ru", {
  day: "numeric",
  month: "long",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: SHOP_TIMEZONE,
});

interface FormState {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  date: string;
  time: string;
  status: BookingStatus;
  notes: string;
  serviceIds: string[];
}

function emptyForm(): FormState {
  return {
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    date: todayInShopTz(),
    time: "",
    status: "DONE",
    notes: "",
    serviceIds: [],
  };
}

export default function AdminPage() {
  // Авторизация (initData) уже проверена в AdminShell — сюда попадаем,
  // только когда она валидна; adminFetch сам прикладывает заголовок.
  const adminFetch = useAdminFetch();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [services, setServices] = useState<ServiceOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setError(null);
    adminFetch("/api/admin/bookings")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(r.status === 401 ? "Доступ запрещён — это не аккаунт барбера." : body.error || "Ошибка загрузки");
        }
        return r.json() as Promise<{ bookings: Booking[] }>;
      })
      .then((data) => setBookings(data.bookings))
      .catch((e: Error) => setError(e.message));
  }, [adminFetch]);

  useEffect(() => {
    // Осознанное исключение из "не звать setState в эффекте напрямую":
    // load() сбрасывает предыдущую ошибку синхронно перед НОВЫМ запросом
    // — тот же паттерн индикатора состояния внешнего запроса, что и в
    // booking-flow.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Список услуг для формы ручного добавления — грузится один раз, не
    // участвует в error/skeleton-состоянии списка заявок (независимая
    // часть экрана): пока список услуг не пришёл, кнопка "+" уже
    // кликабельна, просто чек-лист услуг покажет свой собственный
    // skeleton внутри формы.
    adminFetch("/api/admin/services")
      .then((r) => (r.ok ? (r.json() as Promise<{ services: ServiceOption[] }>) : null))
      .then((data) => data && setServices(data.services))
      .catch(() => {
        /* форма ручного добавления просто останется без списка услуг —
           не критично для остального экрана, ошибку отдельно не показываем */
      });
  }, [load, adminFetch]);

  async function deleteBooking(id: string, clientName: string) {
    // Физическое удаление — необратимо, в отличие от смены статуса, поэтому
    // отдельное подтверждение здесь (в отличие от updateStatus выше).
    if (!window.confirm(`Удалить запись «${clientName}» навсегда? Это действие нельзя отменить.`)) return;
    setPendingId(id);
    try {
      const r = await adminFetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Не удалось удалить запись");
      haptic("success");
      setBookings((prev) => (prev ? prev.filter((b) => b.id !== id) : prev));
    } catch {
      haptic("error");
      setError("Не удалось удалить запись — попробуйте ещё раз.");
    } finally {
      setPendingId(null);
    }
  }

  async function updateStatus(id: string, status: BookingStatus) {
    setPendingId(id);
    try {
      const r = await adminFetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("Не удалось обновить статус");
      haptic("success");
      setBookings((prev) => (prev ? prev.map((b) => (b.id === id ? { ...b, status } : b)) : prev));
    } catch {
      haptic("error");
      setError("Не удалось обновить статус — попробуйте ещё раз.");
    } finally {
      setPendingId(null);
    }
  }

  function startAdd() {
    setAdding(true);
    setForm(emptyForm());
  }
  function cancelAdd() {
    setAdding(false);
  }
  function toggleService(id: string) {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((x) => x !== id) : [...f.serviceIds, id],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.clientName.trim()) {
      setError("Имя клиента обязательно.");
      return;
    }
    if (form.serviceIds.length === 0) {
      setError("Выберите хотя бы одну услугу.");
      return;
    }
    if (!form.date || !form.time) {
      setError("Укажите дату и время.");
      return;
    }
    setSaving(true);
    try {
      const r = await adminFetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: form.clientName.trim(),
          // Пустая строка -> не передаём поле вовсе, чтобы сервер
          // сохранил null (см. комментарий у Booking.clientPhone) — не
          // пустую строку, которая в аналитике выглядела бы как "один и
          // тот же клиент" у всех записей без номера.
          clientPhone: form.clientPhone.trim() || undefined,
          clientEmail: form.clientEmail.trim() || undefined,
          date: form.date,
          time: form.time,
          serviceIds: form.serviceIds,
          status: form.status,
          notes: form.notes.trim() || undefined,
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Не удалось добавить запись");
      haptic("success");
      setAdding(false);
      load();
    } catch (err) {
      haptic("error");
      setError(err instanceof Error ? err.message : "Не удалось добавить запись");
    } finally {
      setSaving(false);
    }
  }

  const selectedServices = services?.filter((s) => form.serviceIds.includes(s.id)) ?? [];
  const selectedDurationMin = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const selectedPriceCents = selectedServices.reduce((sum, s) => sum + s.priceCents, 0);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Заявки на запись</h1>

      {error && <p className={styles.error}>{error}</p>}

      {adding && (
        <form className={styles.card} onSubmit={handleSubmit} style={{ marginBottom: 14 }}>
          <div className={styles.formRow}>
            <input
              className={styles.input}
              placeholder="Имя клиента"
              value={form.clientName}
              onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
              required
            />
            <input
              className={styles.input}
              placeholder="Телефон (необязательно)"
              value={form.clientPhone}
              onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
            />
            <input
              className={styles.input}
              type="email"
              placeholder="Email (необязательно)"
              value={form.clientEmail}
              onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
            />
            <div className={styles.row2}>
              <input
                className={styles.input}
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
              <input
                className={styles.input}
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                required
              />
            </div>

            <span className={styles.label}>Услуги</span>
            {!services && <div className={styles.cardSkeleton} style={{ height: 76 }} />}
            {services &&
              services.map((s) => (
                <label key={s.id} className={styles.toggle}>
                  <input type="checkbox" checked={form.serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                  {s.nameRu} · {s.durationMin} мин · {(s.priceCents / 100).toLocaleString("ru-RU")} MDL
                  {!s.active && " (скрыта)"}
                </label>
              ))}
            {selectedServices.length > 0 && (
              <div className={styles.hint}>
                Итого: {selectedDurationMin} мин · {(selectedPriceCents / 100).toLocaleString("ru-RU")} MDL
              </div>
            )}

            <span className={styles.label}>Статус</span>
            <select
              className={styles.input}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BookingStatus }))}
            >
              {CREATE_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>

            <textarea
              className={styles.textarea}
              placeholder="Заметка (необязательно)"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />

            <div className={styles.btnRow}>
              <button type="submit" className={styles.primaryBtn} disabled={saving}>
                {saving ? "Сохраняем…" : "Добавить"}
              </button>
              <button type="button" className={styles.secondaryBtn} onClick={cancelAdd} disabled={saving}>
                Отмена
              </button>
            </div>
          </div>
        </form>
      )}

      {!error && !bookings && (
        <div className={styles.list}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.cardSkeleton} />
          ))}
        </div>
      )}

      {!error && bookings && bookings.length === 0 && <p className={styles.hint}>Заявок пока нет.</p>}

      {!error && bookings && bookings.length > 0 && (
        <div className={styles.list}>
          {bookings.map((b) => (
            <div key={b.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <span className={styles.clientName}>{b.clientName}</span>
                  {b.source === "MANUAL" && (
                    <span className={`${styles.statusBadge} ${styles.statusDONE}`}>Вручную</span>
                  )}
                </div>
                <span className={`${styles.statusBadge} ${styles[`status${b.status}`]}`}>{STATUS_LABEL[b.status]}</span>
              </div>
              <div className={styles.cardRow}>{dateFmt.format(new Date(b.startsAt))}</div>
              <div className={styles.cardRow}>
                {b.services.map((s) => s.nameRu).join(" + ")} ·{" "}
                {b.services.reduce((sum, s) => sum + s.durationMin, 0)} мин ·{" "}
                {(b.services.reduce((sum, s) => sum + s.priceCents, 0) / 100).toLocaleString("ru-RU")} MDL
              </div>
              {b.clientPhone ? (
                <a className={styles.cardRow} href={`tel:${b.clientPhone.replace(/[^\d+]/g, "")}`}>
                  {b.clientPhone}
                </a>
              ) : (
                <div className={styles.cardRow} style={{ color: "var(--admin-muted)" }}>
                  Телефон не указан
                </div>
              )}
              {b.clientEmail && (
                <a className={styles.cardRow} href={`mailto:${b.clientEmail}`}>
                  {b.clientEmail}
                </a>
              )}
              {b.notes && <div className={styles.notes}>{b.notes}</div>}

              {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                <div className={styles.actions}>
                  {b.status === "PENDING" && (
                    <button
                      type="button"
                      className={styles.confirmBtn}
                      disabled={pendingId === b.id}
                      onClick={() => updateStatus(b.id, "CONFIRMED")}
                    >
                      Подтвердить
                    </button>
                  )}
                  {b.status === "CONFIRMED" && (
                    <button
                      type="button"
                      className={styles.confirmBtn}
                      disabled={pendingId === b.id}
                      onClick={() => updateStatus(b.id, "DONE")}
                    >
                      Отметить выполненной
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    disabled={pendingId === b.id}
                    onClick={() => updateStatus(b.id, "CANCELLED")}
                  >
                    Отменить
                  </button>
                </div>
              )}

              {(b.status === "CANCELLED" || b.status === "DONE") && (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    disabled={pendingId === b.id}
                    onClick={() => deleteBooking(b.id, b.clientName)}
                  >
                    Удалить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!adding && (
        <button type="button" className={styles.fab} onClick={startAdd} aria-label="Добавить запись">
          +
        </button>
      )}
    </main>
  );
}
