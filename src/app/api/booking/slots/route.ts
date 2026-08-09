import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SLOT_MINUTES, localWeekday, zonedTimeToUtc } from "@/lib/shop-time";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

// Свободные слоты на конкретный календарный день. Стартовые точки всегда
// с шагом SLOT_MINUTES (сетка времени в UI не должна прыгать от услуги к
// услуге) — а вот ДЛИТЕЛЬНОСТЬ, которая проверяется на пересечение с
// другими записями/блокировками и на "влезает ли до конца рабочего дня",
// берётся из конкретной услуги (?serviceId=), если она передана. Без
// serviceId (сценарий "сначала время, потом услуга" — сервис ещё не
// выбран) — используется дефолтная SLOT_MINUTES, как раньше.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const serviceId = url.searchParams.get("serviceId");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "invalid date, expected YYYY-MM-DD" }, { status: 400 });
  }

  let durationMin = SLOT_MINUTES;
  if (serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { durationMin: true, active: true },
    });
    // Неизвестный/неактивный serviceId — не 400: тихо откатываемся на
    // дефолтную длительность, чтобы устаревшая ссылка на услугу не
    // ломала весь календарь.
    if (service?.active) durationMin = service.durationMin;
  }

  const weekday = localWeekday(date);
  const wh = await prisma.workingHours.findUnique({ where: { weekday } });
  if (!wh || wh.closed) {
    return NextResponse.json({ slots: [] });
  }

  const dayStart = zonedTimeToUtc(date, wh.startMinute);
  const dayEnd = zonedTimeToUtc(date, wh.endMinute);

  const [timeOff, bookings] = await Promise.all([
    prisma.timeOff.findMany({
      where: { startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.booking.findMany({
      where: {
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
        status: { not: "CANCELLED" },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const blocks = [...timeOff, ...bookings].map((b) => ({
    start: b.startsAt.getTime(),
    end: b.endsAt.getTime(),
  }));

  const now = Date.now();
  const slots: string[] = [];
  // Шаг цикла — всегда SLOT_MINUTES (сетка стартовых точек), а
  // "влезает ли" — по durationMin выбранной услуги (или дефолту).
  for (let minute = wh.startMinute; minute + durationMin <= wh.endMinute; minute += SLOT_MINUTES) {
    const slotStart = zonedTimeToUtc(date, minute).getTime();
    const slotEnd = zonedTimeToUtc(date, minute + durationMin).getTime();
    if (slotStart < now) continue;
    if (blocks.some((b) => overlaps(slotStart, slotEnd, b.start, b.end))) continue;
    const hh = String(Math.floor(minute / 60)).padStart(2, "0");
    const mm = String(minute % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }

  return NextResponse.json({ slots });
}
