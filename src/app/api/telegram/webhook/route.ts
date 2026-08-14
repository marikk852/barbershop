import { NextResponse } from "next/server";
import { applyBookingStatus } from "@/lib/booking-status";
import { prisma } from "@/lib/prisma";
import { answerCallbackQuery, sendTelegramLinkedConfirmation } from "@/lib/telegram-bot";

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID;

interface TelegramUpdate {
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number };
  };
  message?: {
    text?: string;
    chat: { id: number };
  };
}

// Единственная точка входа для ДВУХ разных сценариев, различаются по
// типу апдейта:
//  1. callback_query — барбер нажал "Подтвердить"/"Отклонить" под
//     уведомлением о новой записи (см. notifyAdminNewBooking). Разрешено
//     ТОЛЬКО от ADMIN_TELEGRAM_ID — в остальном это тот же путь, что и
//     кнопки в админке (applyBookingStatus).
//  2. message с текстом "/start <bookingId>" — клиент прошёл по ссылке
//     "Получать уведомления в Telegram" с экрана успеха записи (deep
//     link t.me/<bot>?start=<id>) и запустил бота. Разрешено от ЛЮБОГО
//     пользователя — в этом и весь смысл, так мы узнаём его chat_id.
export async function POST(request: Request) {
  // Секрет — единственная защита эндпоинта: Telegram сам прикладывает
  // его в заголовок на КАЖДЫЙ запрос (задаётся один раз через setWebhook
  // secret_token), без него любой в интернете мог бы слать сюда
  // поддельные апдейты (в том числе выдавая себя за барбера и подтверждая/
  // отменяя чужие записи).
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  if (!WEBHOOK_SECRET || secretHeader !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  if (!update) {
    return NextResponse.json({ ok: true }); // молча игнорируем мусор — Telegram не должен ретраить
  }

  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  } else if (update.message?.text?.startsWith("/start")) {
    await handleStart(update.message);
  }

  // Telegram ждёт быстрый 200 OK на КАЖДЫЙ апдейт независимо от того,
  // что внутри него произошло — иначе считает доставку неуспешной и
  // ретраит тот же апдейт снова.
  return NextResponse.json({ ok: true });
}

async function handleCallbackQuery(cq: NonNullable<TelegramUpdate["callback_query"]>) {
  const isAdmin = ADMIN_TELEGRAM_ID && String(cq.from.id) === ADMIN_TELEGRAM_ID;
  if (!isAdmin) {
    // Не барбер — например, кто-то переслал скриншот с кнопкой и решил
    // нажать. Молча отказываем, без деталей в тексте (не подсказываем
    // структуру callback_data потенциальному атакующему).
    await answerCallbackQuery(cq.id, "Недоступно");
    return;
  }

  const data = cq.data ?? "";
  const [action, bookingId] = data.split(":");
  if ((action !== "confirm" && action !== "cancel") || !bookingId) {
    await answerCallbackQuery(cq.id);
    return;
  }

  const status = action === "confirm" ? "CONFIRMED" : "CANCELLED";
  const result = await applyBookingStatus(bookingId, status);
  await answerCallbackQuery(cq.id, result.ok ? (action === "confirm" ? "Подтверждено" : "Отклонено") : "Запись не найдена");
}

async function handleStart(message: NonNullable<TelegramUpdate["message"]>) {
  // "/start" без payload — ЛИБО кто-то запустил бота напрямую (не по
  // ссылке с сайта), ЛИБО это сам барбер (тестирует/случайно нажал) —
  // в обоих случаях привязывать нечего, просто ничего не делаем молча
  // (заводить отдельное приветственное сообщение для этого случая —
  // отдельная задача, не часть уведомлений о записи).
  const bookingId = message.text?.slice("/start".length).trim();
  if (!bookingId) return;

  // updateMany, а не update — bookingId пришёл из непроверенного deep
  // link (клиент технически может подставить произвольную строку),
  // update() бросил бы на несуществующий id, updateMany молча вернёт
  // count:0 — ожидаемый, не ошибочный случай.
  const result = await prisma.booking.updateMany({
    where: { id: bookingId },
    data: { clientTelegramChatId: BigInt(message.chat.id) },
  });
  if (result.count === 0) return;

  await sendTelegramLinkedConfirmation(BigInt(message.chat.id));
}
