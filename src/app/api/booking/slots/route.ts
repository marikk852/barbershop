import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SLOT_MINUTES, localWeekday, zonedTimeToUtc } from "@/lib/shop-time";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

// Свободные слоты на конкретный календарный день. Длительность слота пока
// фиксированная (SLOT_MINUTES) — учёт длительности выбранной услуги ещё не
// подключён (отдельная задача), см. комментарий в src/lib/shop-time.ts.
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "invalid date, expected YYYY-MM-DD" }, { status: 400 });
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
  for (let minute = wh.startMinute; minute + SLOT_MINUTES <= wh.endMinute; minute += SLOT_MINUTES) {
    const slotStart = zonedTimeToUtc(date, minute).getTime();
    const slotEnd = zonedTimeToUtc(date, minute + SLOT_MINUTES).getTime();
    if (slotStart < now) continue;
    if (blocks.some((b) => overlaps(slotStart, slotEnd, b.start, b.end))) continue;
    const hh = String(Math.floor(minute / 60)).padStart(2, "0");
    const mm = String(minute % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }

  return NextResponse.json({ slots });
}
