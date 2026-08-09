import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { localWeekday, zonedTimeToUtc } from "@/lib/shop-time";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

interface CreateBookingBody {
  serviceId?: string;
  date?: string; // YYYY-MM-DD, в часовом поясе барбершопа
  time?: string; // HH:MM, в часовом поясе барбершопа
  clientName?: string;
  clientPhone?: string;
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

  const { serviceId, date, time, notes } = body;
  const clientName = body.clientName?.trim();
  const clientPhone = body.clientPhone?.trim();

  if (!serviceId || !date || !DATE_RE.test(date) || !time || !TIME_RE.test(time)) {
    return NextResponse.json({ error: "serviceId, date (YYYY-MM-DD) and time (HH:MM) are required" }, { status: 400 });
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

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) {
    return NextResponse.json({ error: "service not found" }, { status: 404 });
  }

  const [hh, mm] = time.split(":").map(Number);
  const startsAt = zonedTimeToUtc(date, hh * 60 + mm);
  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60000);

  if (startsAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "startsAt is in the past" }, { status: 409 });
  }

  const weekday = localWeekday(date);
  const wh = await prisma.workingHours.findUnique({ where: { weekday } });
  if (!wh || wh.closed) {
    return NextResponse.json({ error: "shop is closed that day" }, { status: 409 });
  }
  const dayStartMinute = hh * 60 + mm;
  if (dayStartMinute < wh.startMinute || dayStartMinute + service.durationMin > wh.endMinute) {
    return NextResponse.json({ error: "outside working hours for the chosen service duration" }, { status: 409 });
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

  // Осознанно без доп. блокировки на уровне БД (advisory lock/exclusion
  // constraint) — при ожидаемой нагрузке одного барбершопа (единицы
  // записей в день) риск гонки двух ОДНОВременных запросов на ОДНО и то
  // же время пренебрежимо мал; полноценная защита — отдельная задача,
  // если объём вырастет.
  const booking = await prisma.booking.create({
    data: {
      serviceId,
      clientName,
      clientPhone,
      startsAt,
      endsAt,
      status: "PENDING",
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json({ booking: { id: booking.id } }, { status: 201 });
}
