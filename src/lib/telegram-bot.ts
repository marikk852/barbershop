import { SHOP_TIMEZONE } from "@/lib/shop-time";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID;

const API_BASE = "https://api.telegram.org";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
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
  clientPhone: string;
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
    `📞 ${escapeHtml(data.clientPhone)}`,
    `📅 ${formatDateTime(data.startsAt)}`,
    `✂️ ${escapeHtml(data.servicesLabel)} · ${data.totalDurationMin} мин · ${(data.totalPriceCents / 100).toLocaleString("ru-RU")} MDL`,
  ];
  if (statusLine) lines.push("", statusLine);
  return lines.join("\n");
}

// Отправляется барберу на КАЖДУЮ новую заявку (PENDING) — сразу с
// кнопками, чтобы подтвердить/отклонить можно было прямо из уведомления,
// не открывая админку. message_id возвращается вызывающей стороне —
// сохраняется в Booking.telegramMessageId, чтобы после решения
// ОТРЕДАКТИРОВАТЬ то же сообщение (см. updateAdminBookingMessage), а не
// слать новое.
export async function notifyAdminNewBooking(data: BookingNotifyData): Promise<number | null> {
  if (!ADMIN_TELEGRAM_ID) {
    console.warn("[telegram-bot] ADMIN_TELEGRAM_ID не задан — уведомление барберу пропущено");
    return null;
  }
  const keyboard: InlineButton[][] = [
    [
      { text: "✅ Подтвердить", callback_data: `confirm:${data.id}` },
      { text: "❌ Отклонить", callback_data: `cancel:${data.id}` },
    ],
  ];
  const result = await callApi<{ message_id: number }>("sendMessage", {
    chat_id: ADMIN_TELEGRAM_ID,
    text: bookingCard(data),
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard },
  });
  return result?.message_id ?? null;
}

// После решения (подтвердить/отклонить, из кнопки ИЛИ из админки —
// оба пути в итоге сюда) — редактируем то же самое сообщение барберу:
// дописываем итоговый статус, кнопки убираем (reply_markup: undefined
// в editMessageReplyMarkup не подходит, editMessageText сама заменяет
// и текст, и клавиатуру разом, если reply_markup не передан — она
// просто пропадает).
export async function updateAdminBookingMessage(
  messageId: number,
  data: BookingNotifyData,
  status: "CONFIRMED" | "CANCELLED",
): Promise<void> {
  if (!ADMIN_TELEGRAM_ID) return;
  const statusLine = status === "CONFIRMED" ? "✅ Подтверждена" : "❌ Отклонена";
  await callApi("editMessageText", {
    chat_id: ADMIN_TELEGRAM_ID,
    message_id: messageId,
    text: bookingCard(data, statusLine),
    parse_mode: "HTML",
  });
}

// Уведомление КЛИЕНТУ о смене статуса — только если он успел перейти по
// ссылке "Получать уведомления в Telegram" (см. /api/telegram/webhook,
// обработка /start) и мы знаем его chat_id. Двуязычно (RU+RO в одном
// сообщении), тот же принцип, что и у email-письма в mailer.ts — локаль,
// в которой клиент открывал сайт, нигде не сохраняется вместе с записью.
export async function notifyClientStatusChange(
  chatId: bigint,
  data: { clientName: string; servicesLabel: string; servicesLabelRo: string; startsAt: Date },
  status: "CONFIRMED" | "CANCELLED",
): Promise<void> {
  const isConfirmed = status === "CONFIRMED";
  const dt = formatDateTime(data.startsAt);
  const text = [
    `Здравствуйте, ${escapeHtml(data.clientName)}!`,
    isConfirmed ? "Ваша запись подтверждена:" : "Ваша запись отменена:",
    `📅 ${dt}`,
    `✂️ ${escapeHtml(data.servicesLabel)}`,
    "",
    `Bună, ${escapeHtml(data.clientName)}!`,
    isConfirmed ? "Programarea dvs. a fost confirmată:" : "Programarea dvs. a fost anulată:",
    `✂️ ${escapeHtml(data.servicesLabelRo)}`,
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
