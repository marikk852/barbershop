import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { localWeekday, zonedTimeToUtc } from "@/lib/shop-time";
import { notifyAdminNewBooking } from "@/lib/telegram-bot";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

// Достаточно для отсечения явного мусора ("да", "-" и т.п.) — полная
// RFC 5322 валидация email тут не нужна, письмо просто не уйдёт, если
// адрес всё-таки невалиден (см. src/lib/mailer.ts, ошибка отправки не
// валит запрос на создание записи).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CreateBookingBody {
  serviceIds?: string[];
  date?: string; // YYYY-MM-DD, в часовом поясе барбершопа
  time?: string; // HH:MM, в часовом поясе барбершопа
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  notes?: string;
}

// Создание заявки на запись — публичный эндпоинт (без авторизации,
// клиент сайта), в отличие от /api/admin/*. Никогда не доверяем тому,
// что клиент уже сам отфильтровал слоты через /api/booking/slots —
// между тем, как он открыл форму, и моментом отправки могло пройти
// время (кто-то другой мог занять то же время), поэтому ВСЯ проверка
// доступности (рабочие часы/TimeOff/пересечение с другими записями)
// повторяется здесь заново, на актуальных данных.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CreateBookingBody | null;
  if (!body) {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { date, time, notes } = body;
  // Дубликаты (клиент дважды прислал один и тот же id — не должно
  // случаться штатно, но не доверяем клиенту) схлопываем через Set —
  // иначе одна и та же услуга посчиталась бы в сумме длительности/цены
  // дважды.
  const serviceIds = [...new Set(body.serviceIds ?? [])];
  const clientName = body.clientName?.trim();
  const clientPhone = body.clientPhone?.trim();

  if (serviceIds.length === 0 || !date || !DATE_RE.test(date) || !time || !TIME_RE.test(time)) {
    return NextResponse.json(
      { error: "serviceIds (non-empty array), date (YYYY-MM-DD) and time (HH:MM) are required" },
      { status: 400 },
    );
  }
  if (!clientName || !clientPhone) {
    return NextResponse.json({ error: "clientName and clientPhone are required" }, { status: 400 });
  }
  // Не строгая валидация номера (международные форматы разные) — просто
  // разумный минимум: хотя бы 6 цифр где-то в строке, отсекает явный
  // мусор ("-", "нет" и т.п.) не отсекая реальные номера.
  if ((clientPhone.match(/\d/g)?.length ?? 0) < 6) {
    return NextResponse.json({ error: "clientPhone doesn't look like a phone number" }, { status: 400 });
  }
  const clientEmail = body.clientEmail?.trim() || null;
  if (clientEmail && !EMAIL_RE.test(clientEmail)) {
    return NextResponse.json({ error: "clientEmail doesn't look like an email address" }, { status: 400 });
  }

  const services = await prisma.service.findMany({ where: { id: { in: serviceIds }, active: true } });
  // Не просто "хотя бы одна нашлась" — ВСЕ переданные id обязаны
  // разрешиться в реальную активную услугу, иначе непонятно, что клиент
  // на самом деле выбрал (и сумма длительности/цены заведомо неверна).
  if (services.length !== serviceIds.length) {
    return NextResponse.json({ error: "one or more services not found" }, { status: 404 });
  }
  const totalDurationMin = services.reduce((acc, s) => acc + s.durationMin, 0);

  const [hh, mm] = time.split(":").map(Number);
  const startsAt = zonedTimeToUtc(date, hh * 60 + mm);
  const endsAt = new Date(startsAt.getTime() + totalDurationMin * 60000);

  if (startsAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "startsAt is in the past" }, { status: 409 });
  }

  const weekday = localWeekday(date);
  const wh = await prisma.workingHours.findUnique({ where: { weekday } });
  if (!wh || wh.closed) {
    return NextResponse.json({ error: "shop is closed that day" }, { status: 409 });
  }
  const dayStartMinute = hh * 60 + mm;
  if (dayStartMinute < wh.startMinute || dayStartMinute + totalDurationMin > wh.endMinute) {
    return NextResponse.json({ error: "outside working hours for the chosen services' total duration" }, { status: 409 });
  }

  const [timeOff, bookings] = await Promise.all([
    prisma.timeOff.findMany({
      where: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.booking.findMany({
      where: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, status: { not: "CANCELLED" } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);
  const blocked = [...timeOff, ...bookings].some((b) =>
    overlaps(startsAt.getTime(), endsAt.getTime(), b.startsAt.getTime(), b.endsAt.getTime()),
  );
  if (blocked) {
    // 409, не 400 — запрос был КОРРЕКТНЫМ на момент отправки формы,
    // просто мир успел измениться (кто-то другой занял это время).
    // Клиент должен предложить выбрать другое время, не чинить форму.
    return NextResponse.json({ error: "slot no longer available" }, { status: 409 });
  }

  // Проверка пересечения выше (overlaps по startsAt/endsAt) — это
  // "быстрый" путь, который даёт понятную ошибку клиенту без лишнего
  // похода к БД за деталями. САМА защита от гонки двух ОДНОВременных
  // запросов на пересекающееся время — не она, а constraint на уровне
  // PostgreSQL (Booking_no_overlap, EXCLUDE USING gist, см. миграцию
  // 20260801203411_init): вставка второй пересекающейся записи упадёт
  // на уровне БД, даже если оба запроса прошли проверку выше одновременно.
  // services: create — вложенная запись сразу создаёт и Booking, и все
  // BookingService-строки одной транзакцией (Prisma сама оборачивает
  // nested write в транзакцию) — не может получиться Booking без единой
  // услуги или наоборот.
  let booking;
  try {
    booking = await prisma.booking.create({
      data: {
        clientName,
        clientPhone,
        clientEmail,
        startsAt,
        endsAt,
        status: "PENDING",
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
    // Prisma P2010/23P01 — сработал Booking_no_overlap: кто-то другой
    // успел занять пересекающееся время между проверкой overlaps() выше
    // и этой самой вставкой (гонка). Тот же ответ, что и для "быстрого"
    // пути — клиенту всё равно, на каком именно уровне обнаружили
    // конфликт, поведение формы (сброс времени + перезапрос сетки)
    // одинаковое в обоих случаях.
    return NextResponse.json({ error: "slot no longer available" }, { status: 409 });
  }

  // Уведомление барберу в Telegram — best-effort, та же логика, что и
  // email-уведомления в applyBookingStatus: запись уже создана и
  // сохранена независимо от исхода отправки, await — чтобы serverless-
  // функция не была убита раньше, чем допишет запрос к Bot API.
  // message_id сохраняем ОТДЕЛЬНЫМ update (не в исходном create) —
  // сам message_id физически появляется только ПОСЛЕ того, как
  // сообщение реально отправлено, требует id уже созданной записи
  // (используется в кнопках confirm:<id>/cancel:<id>) — курица и яйцо,
  // будь это одним запросом.
  const telegramMessageId = await notifyAdminNewBooking({
    id: booking.id,
    clientName,
    clientPhone,
    startsAt,
    servicesLabel: services.map((s) => s.nameRu).join(" + "),
    totalDurationMin,
    totalPriceCents: services.reduce((acc, s) => acc + s.priceCents, 0),
  });
  if (telegramMessageId) {
    await prisma.booking.update({ where: { id: booking.id }, data: { telegramMessageId } });
  }

  return NextResponse.json({ booking: { id: booking.id } }, { status: 201 });
}
