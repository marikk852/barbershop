import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { zonedTimeToUtc } from "@/lib/shop-time";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// Отдаёт всё, что нужно календарю, чтобы самому решить, какие дни месяца
// недоступны для записи — без похода на сервер за каждый день отдельно:
// график по дням недели (обычно закрыт только один день) + единичные
// блокировки (TimeOff), пересекающие месяц. Само решение "закрыт ли
// конкретный день целиком" считает клиент через isDayFullyBlocked
// (src/lib/shop-time.ts) — та же функция, что использовал бы сервер,
// один код на оба места.
export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month");
  if (!month || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: "invalid month, expected YYYY-MM" }, { status: 400 });
  }

  const [y, m] = month.split("-").map(Number);
  const firstOfMonth = `${month}-01`;
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

  // Паддинг в сутки с каждой стороны — с запасом перекрывает случай, когда
  // граница месяца в часовом поясе барбершопа сдвинута относительно UTC.
  const rangeStart = new Date(zonedTimeToUtc(firstOfMonth, 0).getTime() - 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(zonedTimeToUtc(`${nextMonth}-01`, 0).getTime() + 24 * 60 * 60 * 1000);

  const [workingHours, timeOff] = await Promise.all([
    prisma.workingHours.findMany({ orderBy: { weekday: "asc" } }),
    prisma.timeOff.findMany({
      where: { startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  return NextResponse.json({
    workingHours: workingHours.map((h) => ({
      weekday: h.weekday,
      startMinute: h.startMinute,
      endMinute: h.endMinute,
      closed: h.closed,
    })),
    timeOff: timeOff.map((t) => ({ startsAt: t.startsAt.toISOString(), endsAt: t.endsAt.toISOString() })),
  });
}
