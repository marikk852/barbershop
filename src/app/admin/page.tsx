"use client";

import { useCallback, useEffect, useState } from "react";
import { SHOP_TIMEZONE } from "@/lib/shop-time";
import { haptic, useTelegramWebApp } from "@/lib/telegram-webapp";
import styles from "./admin.module.css";

type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "DONE";

interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  notes: string | null;
  service: { nameRu: string; nameRo: string; durationMin: number; priceCents: number };
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
  const { checked, initData } = useTelegramWebApp();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!initData) return;
    setError(null);
    fetch("/api/admin/bookings", { headers: { Authorization: `tma ${initData}` } })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(r.status === 401 ? "Доступ запрещён — это не аккаунт барбера." : body.error || "Ошибка загрузки");
        }
        return r.json() as Promise<{ bookings: Booking[] }>;
      })
      .then((data) => setBookings(data.bookings))
      .catch((e: Error) => setError(e.message));
  }, [initData]);

  useEffect(() => {
    // Осознанное исключение из "не звать setState в эффекте напрямую":
    // load() сбрасывает предыдущую ошибку синхронно перед НОВЫМ запросом
    // (initData появился/сменился) — тот же паттерн индикатора состояния
    // внешнего запроса, что и в booking-flow.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function updateStatus(id: string, status: BookingStatus) {
    if (!initData) return;
    setPendingId(id);
    try {
      const r = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { Authorization: `tma ${initData}`, "Content-Type": "application/json" },
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

  // !checked: эффект хука ещё не отработал (первый рендер).
  if (!checked) {
    return <main className={styles.centerMsg}>Загрузка…</main>;
  }
  // !initData: страницу открыли НЕ из настоящего Telegram-клиента (см.
  // подробное объяснение в telegram-webapp.ts — window.Telegram.WebApp
  // при этом обычно СУЩЕСТВУЕТ, просто с пустым initData).
  if (!initData) {
    return (
      <main className={styles.centerMsg}>
        Откройте эту страницу через кнопку бота в Telegram — напрямую в
        браузере она не работает (нужна авторизация через Telegram).
      </main>
    );
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
                {b.service.nameRu} · {b.service.durationMin} мин · {(b.service.priceCents / 100).toLocaleString("ru-RU")} MDL
              </div>
              <a className={styles.cardRow} href={`tel:${b.clientPhone.replace(/[^\d+]/g, "")}`}>
                {b.clientPhone}
              </a>
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
