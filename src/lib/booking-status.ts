import { prisma } from "@/lib/prisma";
import { sendBookingStatusEmail } from "@/lib/mailer";
import {
  logBookingHistory,
  notifyClientStatusChange,
  updateAdminBookingMessage,
  type BookingNotifyData,
} from "@/lib/telegram-bot";

export const ALLOWED_BOOKING_STATUSES = ["CONFIRMED", "CANCELLED", "DONE"] as const;
export type AllowedBookingStatus = (typeof ALLOWED_BOOKING_STATUSES)[number];

export type ApplyStatusResult = { ok: true; id: string; status: string } | { ok: false; reason: "not-found" };

// Общая точка входа для смены статуса записи — раньше жила только в
// PATCH /api/admin/bookings/[id] (ручное подтверждение из админки),
// теперь сюда же приходит и нажатие кнопки под Telegram-уведомлением
// (см. /api/telegram/webhook): один и тот же путь валидации + рассылки
// уведомлений (email клиенту, Telegram клиенту, редактирование
// сообщения барберу), не два дублирующих друг друга.
export async function applyBookingStatus(id: string, status: AllowedBookingStatus): Promise<ApplyStatusResult> {
  let updated;
  try {
    updated = await prisma.booking.update({
      where: { id },
      data: { status },
      include: { services: { include: { service: { select: { nameRu: true, nameRo: true, priceCents: true } } } } },
    });
  } catch {
    // Prisma кидает при "запись не найдена" (P2025) — единственный
    // реалистичный сценарий ошибки здесь (id уже провалидирован формой
    // запроса выше по стеку); не разбираем код конкретно, 404 корректен
    // в обоих смыслах.
    return { ok: false, reason: "not-found" };
  }

  // DONE — внутренняя пометка барбера постфактум (услуга оказана),
  // клиенту и так уже всё известно, уведомлять незачем. Заодно (не
  // через Set.has(), тот не сужает тип для TS) дальше status
  // гарантированно "CONFIRMED" | "CANCELLED", ровно то, что ждут
  // sendBookingStatusEmail/notifyClientStatusChange/
  // updateAdminBookingMessage.
  if (status !== "CONFIRMED" && status !== "CANCELLED") {
    return { ok: true, id: updated.id, status: updated.status };
  }

  const servicesLabelRu = updated.services.map((bs) => bs.service.nameRu).join(" + ");
  const servicesLabelRo = updated.services.map((bs) => bs.service.nameRo).join(" + ");
  const totalDurationMin = updated.services.reduce((sum, bs) => sum + bs.durationMin, 0);
  const totalPriceCents = updated.services.reduce((sum, bs) => sum + bs.priceCents, 0);

  // Все три уведомления — best-effort, не часть "транзакции" смены
  // статуса: статус брони уже сохранён независимо от их исхода. ВАЖНО:
  // await на каждое, а не "fire and forget" — serverless-функция может
  // быть заморожена/убита сразу после отправки HTTP-ответа, недописанный
  // "void"-промис рисковал бы никогда не долететь до места назначения.
  // Каждая функция сама ловит свои ошибки и не бросает наружу.
  if (updated.clientEmail) {
    await sendBookingStatusEmail(
      {
        clientEmail: updated.clientEmail,
        clientName: updated.clientName,
        serviceNameRu: servicesLabelRu,
        serviceNameRo: servicesLabelRo,
        startsAt: updated.startsAt,
      },
      status,
    );
  }

  if (updated.clientTelegramChatId) {
    await notifyClientStatusChange(
      updated.clientTelegramChatId,
      { clientName: updated.clientName, servicesLabel: servicesLabelRu, servicesLabelRo, startsAt: updated.startsAt },
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
  // Два РАЗНЫХ сообщения в группе: редактируем исходную карточку в
  // "Заявках" (если она вообще была отправлена — telegramMessageId
  // мог не сохраниться при сетевом сбое на создании) И отдельно
  // логируем решение в "Историю" — та растёт, не зависит от того,
  // нашлась ли исходная карточка для редактирования.
  if (updated.telegramMessageId) {
    await updateAdminBookingMessage(updated.telegramMessageId, notifyData, status);
  }
  await logBookingHistory(notifyData, status);

  return { ok: true, id: updated.id, status: updated.status };
}
