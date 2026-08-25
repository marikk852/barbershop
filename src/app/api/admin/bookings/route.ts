import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";
import { zonedTimeToUtc } from "@/lib/shop-time";

// Список заявок для админки — новые/ожидающие первыми (барберу важнее
// всего разобрать очередь PENDING), внутри каждого статуса — по времени
// записи (startsAt), не по дате создания: барберу важно "что раньше
// состоится", а не "что раньше пришло".
const STATUS_ORDER: Record<string, number> = { PENDING: 0, CONFIRMED: 1, DONE: 2, CANCELLED: 3 };

export async function GET(request: Request) {
  const auth = await requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    include: {
      services: {
        include: { service: { select: { nameRu: true, nameRo: true } } },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  bookings.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      clientName: b.clientName,
      clientPhone: b.clientPhone,
      clientEmail: b.clientEmail,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      status: b.status,
      source: b.source,
      notes: b.notes,
      // durationMin/priceCents — снимок с момента бронирования (см.
      // BookingService в схеме), не текущие значения услуги — так
      // список записей в админке не "уедет" задним числом, если барбер
      // потом поменяет цену/длительность в прайс-листе.
      services: b.services.map((bs) => ({
        nameRu: bs.service.nameRu,
        nameRo: bs.service.nameRo,
        durationMin: bs.durationMin,
        priceCents: bs.priceCents,
      })),
    })),
  });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CREATE_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "DONE"] as const;
type CreateStatus = (typeof CREATE_STATUSES)[number];

interface CreateManualBookingBody {
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  date?: string; // YYYY-MM-DD, в часовом поясе барбершопа
  time?: string; // HH:MM, в часовом поясе барбершопа
  serviceIds?: string[];
  status?: string;
  notes?: string;
}

// Ручное внесение записи барбером — визит, который случился ВНЕ сайта
// (звонок, уличный клиент), но должен учитываться в аналитике наравне с
// онлайн-записями (весь смысл этого эндпоинта). В отличие от публичного
// POST /api/booking — НАМЕРЕННО:
// - без проверки рабочих часов/TimeOff — барбер знает лучше алгоритма
//   (мог принять клиента вне графика, либо вносит историческую запись,
//   сделанную ДО того как график поменялся);
// - без запрета на прошедшую дату — типичный случай тут именно
//   "запиши визит, который уже был";
// - телефон необязателен (уличный клиент часто не оставляет номер, см.
//   Booking.clientPhone в схеме и identityKey() в lib/analytics.ts —
//   как это учитывается при подсчёте клиентов);
// - услуги ищутся СРЕДИ ВСЕХ (не только active) — вносить исторический
//   визит можно и по услуге, которую барбер потом снял с прайса;
// - никаких Telegram/email-уведомлений — это бухгалтерская запись
//   постфактум, а не живая заявка, ждущая решения.
// Единственное, что остаётся общим с публичным API — сам constraint
// БД Booking_no_overlap (см. миграцию 20260801203411_init): двум НЕ
// отменённым записям физически нельзя пересекаться по времени, это
// защита целостности данных, а не бизнес-правило про рабочие часы.
export async function POST(request: Request) {
  const auth = await requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreateManualBookingBody | null;
  if (!body) {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const clientName = body.clientName?.trim();
  const { date, time, notes } = body;
  const serviceIds = [...new Set(body.serviceIds ?? [])];

  if (!clientName) {
    return NextResponse.json({ error: "clientName is required" }, { status: 400 });
  }
  if (serviceIds.length === 0 || !date || !DATE_RE.test(date) || !time || !TIME_RE.test(time)) {
    return NextResponse.json(
      { error: "serviceIds (non-empty array), date (YYYY-MM-DD) and time (HH:MM) are required" },
      { status: 400 },
    );
  }

  // Телефон — единственное поле, которое здесь НЕОБЯЗАТЕЛЬНО (в отличие
  // от публичной формы, см. комментарий выше). Пустая строка трактуется
  // как "не указан" (null), а не сохраняется как есть — иначе разные
  // визиты с пустой строкой в поле выглядели бы как ОДИН И ТОТ ЖЕ
  // клиент в аналитике (группировка по точному совпадению строки).
  const clientPhoneRaw = body.clientPhone?.trim();
  if (clientPhoneRaw && (clientPhoneRaw.match(/\d/g)?.length ?? 0) < 6) {
    return NextResponse.json({ error: "clientPhone doesn't look like a phone number" }, { status: 400 });
  }
  const clientPhone = clientPhoneRaw || null;

  const clientEmail = body.clientEmail?.trim() || null;
  if (clientEmail && !EMAIL_RE.test(clientEmail)) {
    return NextResponse.json({ error: "clientEmail doesn't look like an email address" }, { status: 400 });
  }

  const status: CreateStatus = CREATE_STATUSES.includes(body.status as CreateStatus)
    ? (body.status as CreateStatus)
    : "DONE";

  // Все услуги (не только active — см. комментарий у функции выше).
  const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
  if (services.length !== serviceIds.length) {
    return NextResponse.json({ error: "one or more services not found" }, { status: 404 });
  }
  const totalDurationMin = services.reduce((acc, s) => acc + s.durationMin, 0);

  const [hh, mm] = time.split(":").map(Number);
  const startsAt = zonedTimeToUtc(date, hh * 60 + mm);
  const endsAt = new Date(startsAt.getTime() + totalDurationMin * 60000);

  let booking;
  try {
    booking = await prisma.booking.create({
      data: {
        clientName,
        clientPhone,
        clientEmail,
        startsAt,
        endsAt,
        status,
        source: "MANUAL",
        notes: notes?.trim() || null,
        services: {
          create: services.map((s) => ({
            serviceId: s.id,
            durationMin: s.durationMin,
            priceCents: s.priceCents,
          })),
        },
      },
    });
  } catch {
    // Booking_no_overlap (см. комментарий выше про constraint) — время
    // пересекается с уже существующей НЕ отменённой записью. Тот же
    // смысл 409, что и в публичном API: barbershop-level конфликт, а не
    // ошибка формы — барбер должен поправить время, а не поля.
    return NextResponse.json({ error: "time overlaps with an existing booking" }, { status: 409 });
  }

  return NextResponse.json({ booking: { id: booking.id } }, { status: 201 });
}
