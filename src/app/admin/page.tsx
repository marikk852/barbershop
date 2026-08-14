"use client";

import { useCallback, useEffect, useState } from "react";
import { SHOP_TIMEZONE } from "@/lib/shop-time";
import { useAdminFetch } from "@/lib/admin-context";
import { haptic } from "@/lib/telegram-webapp";
import styles from "./admin.module.css";

type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "DONE";

interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  notes: string | null;
  // Снимок на момент бронирования (см. BookingService в схеме) — не
  // текущие значения услуги, список может быть длиной 1 или больше.
  services: { nameRu: string; nameRo: string; durationMin: number; priceCents: number }[];
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Ожидает подтверждения",
  CONFIRMED: "Подтверждена",
  CANCELLED: "Отменена",
  DONE: "Выполнена",
};

const dateFmt = new Intl.DateTimeFormat("ru", {
  day: "numeric",
  month: "long",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: SHOP_TIMEZONE,
});

export default function AdminPage() {
  // Авторизация (initData) уже проверена в AdminShell — сюда попадаем,
  // только когда она валидна; adminFetch сам прикладывает заголовок.
  const adminFetch = useAdminFetch();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

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
  }, [load]);

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

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Заявки на запись</h1>

      {error && <p className={styles.error}>{error}</p>}

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
                <span className={styles.clientName}>{b.clientName}</span>
                <span className={`${styles.statusBadge} ${styles[`status${b.status}`]}`}>{STATUS_LABEL[b.status]}</span>
              </div>
              <div className={styles.cardRow}>{dateFmt.format(new Date(b.startsAt))}</div>
              <div className={styles.cardRow}>
                {b.services.map((s) => s.nameRu).join(" + ")} ·{" "}
                {b.services.reduce((sum, s) => sum + s.durationMin, 0)} мин ·{" "}
                {(b.services.reduce((sum, s) => sum + s.priceCents, 0) / 100).toLocaleString("ru-RU")} MDL
              </div>
              <a className={styles.cardRow} href={`tel:${b.clientPhone.replace(/[^\d+]/g, "")}`}>
                {b.clientPhone}
              </a>
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
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
