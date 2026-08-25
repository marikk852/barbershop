import { SHOP_TIMEZONE } from "@/lib/shop-time";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Группа "WKondrea_barber" (форум-режим, темы включены) — уведомления
// барберу переехали из личного чата с ботом сюда, по прямой просьбе
// пользователя. Тема "Заявки" — это General, у нашего API-запроса для
// неё НЕТ отдельного message_thread_id (сообщения без этого поля летят
// в General сами по себе — так уже проверено вживую через getUpdates).
// Тема "История" — обычная (не General), у неё есть свой id, см.
// HISTORY_TOPIC_ID ниже. ADMIN_TELEGRAM_ID остаётся отдельно (используется
// в /api/telegram/webhook — кто именно из участников группы имеет право
// нажимать кнопки подтверждения, а не куда слать сообщения).
const ADMIN_GROUP_CHAT_ID = process.env.TELEGRAM_ADMIN_GROUP_CHAT_ID;
const HISTORY_TOPIC_ID = process.env.TELEGRAM_HISTORY_TOPIC_ID;

const API_BASE = "https://api.telegram.org";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Дефолт "ru" — карточка барберу (bookingCard) всегда на русском вне
// зависимости от локали клиента (это внутреннее сообщение для барбера,
// не клиентское); notifyClientStatusChange ниже передаёт locale явно.
function formatDateTime(d: Date, locale: "ru" | "ro" = "ru"): string {
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SHOP_TIMEZONE,
  }).format(d);
}

interface InlineButton {
  text: string;
  callback_data: string;
}

// Тонкая обёртка над Bot API — намеренно без Telegraf/grammy (та же
// логика, что и у остального проекта: nav-иконки нарисованы вручную
// вместо библиотеки, тут пара HTTP-методов, тащить фреймворк ради них
// незачем). Все функции best-effort — ошибка Telegram API не должна
// валить запрос, который их вызывает (создание записи/смену статуса),
// только логируется, тем же принципом, что и sendBookingStatusEmail в
// mailer.ts.
async function callApi<T>(method: string, body: Record<string, unknown>): Promise<T | null> {
  if (!BOT_TOKEN) {
    console.warn(`[telegram-bot] TELEGRAM_BOT_TOKEN не задан — ${method} пропущен`);
    return null;
  }
  try {
    const r = await fetch(`${API_BASE}/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await r.json()) as { ok: boolean; result?: T; description?: string };
    if (!data.ok) {
      console.error(`[telegram-bot] ${method} не удался:`, data.description);
      return null;
    }
    return data.result ?? null;
  } catch (error) {
    console.error(`[telegram-bot] ${method} — ошибка сети:`, error);
    return null;
  }
}

export interface BookingNotifyData {
  id: string;
  clientName: string;
  /// NULL — запись внесена барбером вручную без номера (source=MANUAL,
  /// см. Booking.clientPhone в schema.prisma).
  clientPhone: string | null;
  startsAt: Date;
  /// "Стрижка + Оформление бороды" — уже склеено вызывающей стороной
  /// (та же логика, что и serviceNameRu в mailer.ts).
  servicesLabel: string;
  totalDurationMin: number;
  totalPriceCents: number;
}

function bookingCard(data: BookingNotifyData, statusLine?: string): string {
  const lines = [
    "🆕 <b>Новая запись</b>",
    "",
    `👤 ${escapeHtml(data.clientName)}`,
    `📞 ${data.clientPhone ? escapeHtml(data.clientPhone) : "не указан"}`,
    `📅 ${formatDateTime(data.startsAt)}`,
    `✂️ ${escapeHtml(data.servicesLabel)} · ${data.totalDurationMin} мин · ${(data.totalPriceCents / 100).toLocaleString("ru-RU")} MDL`,
  ];
  if (statusLine) lines.push("", statusLine);
  return lines.join("\n");
}

// Отправляется в тему "Заявки" (General группы) на КАЖДУЮ новую заявку
// (PENDING) — сразу с кнопками, чтобы подтвердить/отклонить можно было
// прямо из уведомления, не открывая админку. message_id возвращается
// вызывающей стороне — сохраняется в Booking.telegramMessageId, чтобы
// после решения ОТРЕДАКТИРОВАТЬ то же сообщение (см.
// updateAdminBookingMessage), а не слать новое.
export async function notifyAdminNewBooking(data: BookingNotifyData): Promise<number | null> {
  if (!ADMIN_GROUP_CHAT_ID) {
    console.warn("[telegram-bot] TELEGRAM_ADMIN_GROUP_CHAT_ID не задан — уведомление барберу пропущено");
    return null;
  }
  const keyboard: InlineButton[][] = [
    [
      { text: "✅ Подтвердить", callback_data: `confirm:${data.id}` },
      { text: "❌ Отклонить", callback_data: `cancel:${data.id}` },
    ],
  ];
  const result = await callApi<{ message_id: number }>("sendMessage", {
    chat_id: ADMIN_GROUP_CHAT_ID,
    text: bookingCard(data),
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard },
  });
  return result?.message_id ?? null;
}

// После решения (подтвердить/отклонить, из кнопки ИЛИ из админки —
// оба пути в итоге сюда) — карточка в "Заявках" полностью УДАЛЯЕТСЯ
// (по прямой просьбе пользователя: тема "Заявки" — только для того, что
// реально ждёт решения, решённое там не нужно вообще, даже с финальным
// статусом). Раньше здесь было editMessageText (дописать статус, оставить
// на месте) — заменено на deleteMessage. Единственный след решения —
// отдельное сообщение в "Записях" (см. logBookingHistory), которое
// вызывается ВМЕСТЕ с этой функцией из applyBookingStatus.
export async function deleteAdminBookingMessage(messageId: number): Promise<void> {
  if (!ADMIN_GROUP_CHAT_ID) return;
  await callApi("deleteMessage", { chat_id: ADMIN_GROUP_CHAT_ID, message_id: messageId });
}

// Новое сообщение в теме "Записи" — единственный оставшийся след решения
// после того, как исходная карточка в "Заявках" удалена (см.
// deleteAdminBookingMessage выше): "Заявки" — только то, что реально ждёт
// действия, всё решённое переезжает сюда, а не дублируется на два места.
// Без message_thread_id сообщение улетело бы в General ("Заявки") —
// HISTORY_TOPIC_ID обязателен именно здесь.
export async function logBookingHistory(data: BookingNotifyData, status: "CONFIRMED" | "CANCELLED"): Promise<void> {
  if (!ADMIN_GROUP_CHAT_ID || !HISTORY_TOPIC_ID) return;
  const statusLine = status === "CONFIRMED" ? "✅ Подтверждена" : "❌ Отклонена";
  await callApi("sendMessage", {
    chat_id: ADMIN_GROUP_CHAT_ID,
    message_thread_id: Number(HISTORY_TOPIC_ID),
    text: bookingCard(data, statusLine),
    parse_mode: "HTML",
  });
}

// Уведомление КЛИЕНТУ о смене статуса — только если он успел перейти по
// ссылке "Получать уведомления в Telegram" (см. /api/telegram/webhook,
// обработка /start) и мы знаем его chat_id. Раньше уходило двуязычно
// (RU+RO в одном сообщении) — по прямой просьбе пользователя заменено на
// язык сайта, на котором клиент оформлял заявку (Booking.locale, тот же
// принцип, что и у email-письма в mailer.ts).
export async function notifyClientStatusChange(
  chatId: bigint,
  data: { clientName: string; servicesLabel: string; servicesLabelRo: string; startsAt: Date; locale: "ru" | "ro" },
  status: "CONFIRMED" | "CANCELLED",
): Promise<void> {
  const isConfirmed = status === "CONFIRMED";
  const dt = formatDateTime(data.startsAt, data.locale);
  const text =
    data.locale === "ro"
      ? [
          `Bună, ${escapeHtml(data.clientName)}!`,
          isConfirmed ? "Programarea dvs. a fost confirmată:" : "Programarea dvs. a fost anulată:",
          `📅 ${dt}`,
          `✂️ ${escapeHtml(data.servicesLabelRo)}`,
        ].join("\n")
      : [
          `Здравствуйте, ${escapeHtml(data.clientName)}!`,
          isConfirmed ? "Ваша запись подтверждена:" : "Ваша запись отменена:",
          `📅 ${dt}`,
          `✂️ ${escapeHtml(data.servicesLabel)}`,
        ].join("\n");
  await callApi("sendMessage", { chat_id: chatId.toString(), text });
}

// Ответ клиенту сразу после /start?<bookingId> — подтверждает, что
// привязка chat_id к записи сработала (см. webhook). Отдельно от
// notifyClientStatusChange: это не про статус записи, а про сам факт
// подписки на уведомления.
export async function sendTelegramLinkedConfirmation(chatId: bigint): Promise<void> {
  await callApi("sendMessage", {
    chat_id: chatId.toString(),
    text: "Готово! Будем присылать сюда уведомления о статусе вашей записи.\n\nGata! Vă vom trimite aici notificări despre statusul programării.",
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await callApi("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}
