import { prisma } from "@/lib/prisma";
import { sendBookingStatusEmail } from "@/lib/mailer";
import {
  deleteAdminBookingMessage,
  logBookingHistory,
  notifyClientStatusChange,
  type BookingNotifyData,
} from "@/lib/telegram-bot";

export const ALLOWED_BOOKING_STATUSES = ["CONFIRMED", "CANCELLED", "DONE"] as const;
export type AllowedBookingStatus = (typeof ALLOWED_BOOKING_STATUSES)[number];

export type ApplyStatusResult = { ok: true; id: string; status: string } | { ok: false; reason: "not-found" };

// Быстрая часть — ТОЛЬКО смена статуса в БД, без единого сетевого вызова
// вовне. Вынесена отдельно (см. applyBookingStatus и webhook ниже) —
// найденный баг: /api/telegram/webhook раньше вызывал answerCallbackQuery
// (тост "Подтверждено"/"Отклонено" в Telegram) ПОСЛЕДНИМ шагом, ПОСЛЕ
// всей цепочки email+Telegram-клиенту+удаление карточки+запись в
// историю — 4-5 последовательных сетевых вызова (особенно SMTP на Gmail
// — медленный TLS-хендшейк) могли не уложиться в лимит времени
// serverless-функции на Vercel: барбер жал кнопку в группе и не видел
// СОВСЕМ НИЧЕГО (ни тоста, ни изменений) — функцию обрывало ДО того как
// она успевала вообще ответить Telegram, хотя сама смена статуса (эта
// функция) уже могла пройти успешно.
async function updateBookingStatus(id: string, status: AllowedBookingStatus) {
  try {
    return await prisma.booking.update({
      where: { id },
      data: { status },
      include: { services: { include: { service: { select: { nameRu: true, nameRo: true, priceCents: true } } } } },
    });
  } catch {
    // Prisma кидает при "запись не найдена" (P2025) — единственный
    // реалистичный сценарий ошибки здесь (id уже провалидирован формой
    // запроса выше по стеку); не разбираем код конкретно, null корректен
    // в обоих смыслах.
    return null;
  }
}

type UpdatedBooking = NonNullable<Awaited<ReturnType<typeof updateBookingStatus>>>;

// Медленная часть — три уведомления (email клиенту, Telegram клиенту,
// удаление карточки в "Заявках" + запись решения в "Записи"). Все
// best-effort, не часть "транзакции" смены статуса: статус брони уже
// сохранён независимо от их исхода. ВАЖНО: await на каждое, а не
// "fire and forget" — serverless-функция может быть заморожена/убита
// сразу после отправки HTTP-ответа ВЫЗЫВАЮЩЕЙ стороны (webhook/PATCH),
// недописанный "void"-промис рисковал бы никогда не долететь до места
// назначения. Каждая функция сама ловит свои ошибки и не бросает наружу.
async function sendBookingNotifications(updated: UpdatedBooking, status: "CONFIRMED" | "CANCELLED"): Promise<void> {
  const servicesLabelRu = updated.services.map((bs) => bs.service.nameRu).join(" + ");
  const servicesLabelRo = updated.services.map((bs) => bs.service.nameRo).join(" + ");
  const totalDurationMin = updated.services.reduce((sum, bs) => sum + bs.durationMin, 0);
  const totalPriceCents = updated.services.reduce((sum, bs) => sum + bs.priceCents, 0);

  // Booking.locale — язык сайта, на котором клиент оформлял заявку
  // ("ru"/"ro", @default("ru") покрывает записи, созданные до появления
  // этого поля) — оба клиентских канала уходят ТОЛЬКО на нём, не
  // двуязычно (было RU+RO в одном сообщении).
  const clientLocale = updated.locale === "ro" ? "ro" : "ru";

  if (updated.clientEmail) {
    await sendBookingStatusEmail(
      {
        clientEmail: updated.clientEmail,
        clientName: updated.clientName,
        serviceNameRu: servicesLabelRu,
        serviceNameRo: servicesLabelRo,
        startsAt: updated.startsAt,
        locale: clientLocale,
      },
      status,
    );
  }

  if (updated.clientTelegramChatId) {
    await notifyClientStatusChange(
      updated.clientTelegramChatId,
      {
        clientName: updated.clientName,
        servicesLabel: servicesLabelRu,
        servicesLabelRo,
        startsAt: updated.startsAt,
        locale: clientLocale,
      },
      status,
    );
  }

  const notifyData: BookingNotifyData = {
    id: updated.id,
    clientName: updated.clientName,
    clientPhone: updated.clientPhone,
    startsAt: updated.startsAt,
    servicesLabel: servicesLabelRu,
    totalDurationMin,
    totalPriceCents,
  };
  // "Заявки" — только то, что ждёт решения: удаляем исходную карточку
  // (если она вообще была отправлена — telegramMessageId мог не
  // сохраниться при сетевом сбое на создании), а сам факт решения
  // переезжает отдельным сообщением в "Записи" (растущий лог, не
  // зависит от того, нашлась ли исходная карточка для удаления).
  if (updated.telegramMessageId) {
    await deleteAdminBookingMessage(updated.telegramMessageId);
  }
  await logBookingHistory(notifyData, status);
}

// Общая точка входа для смены статуса записи — раньше жила только в
// PATCH /api/admin/bookings/[id] (ручное подтверждение из админки),
// теперь сюда же приходит и нажатие кнопки под Telegram-уведомлением
// (см. /api/telegram/webhook): один и тот же путь валидации + рассылки
// уведомлений, не два дублирующих друг друга. Для PATCH (обычный HTTP-
// запрос из браузера админки) порядок фаз внутри не важен — фронт и так
// ждёт полного ответа. Webhook же вызывает фазы РАЗДЕЛЬНО (см. его код)
// — см. комментарий у updateBookingStatus выше, почему.
export async function applyBookingStatus(id: string, status: AllowedBookingStatus): Promise<ApplyStatusResult> {
  const updated = await updateBookingStatus(id, status);
  if (!updated) {
    return { ok: false, reason: "not-found" };
  }

  // DONE — внутренняя пометка барбера постфактум (услуга оказана),
  // клиенту и так уже всё известно, уведомлять незачем.
  if (status === "CONFIRMED" || status === "CANCELLED") {
    await sendBookingNotifications(updated, status);
  }

  return { ok: true, id: updated.id, status: updated.status };
}

export { updateBookingStatus, sendBookingNotifications };
export type { UpdatedBooking };
