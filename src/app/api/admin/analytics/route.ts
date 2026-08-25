import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";
import { todayInShopTz, localWeekday } from "@/lib/shop-time";
import { getPeriodRange, getBuckets, computeAnalytics, type Period } from "@/lib/analytics";

const PERIODS: Period[] = ["day", "week", "month", "year"];

export async function GET(request: Request) {
  const auth = await requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const url = new URL(request.url);
  const periodParam = url.searchParams.get("period");
  const period: Period = PERIODS.includes(periodParam as Period) ? (periodParam as Period) : "week";
  const anchor = url.searchParams.get("date") || todayInShopTz();

  const range = getPeriodRange(period, anchor);

  // Часовые бакеты дневного графика нужны только для period="day" — под
  // рабочие часы АНКОРНОГО дня (не текущего), чтобы навигация ‹/› по дням
  // корректно двигала сетку часов вместе с датой.
  let dayHours: { startMinute: number; endMinute: number } | null = null;
  if (period === "day") {
    const wh = await prisma.workingHours.findUnique({ where: { weekday: localWeekday(anchor) } });
    dayHours = wh && !wh.closed ? { startMinute: wh.startMinute, endMinute: wh.endMinute } : null;
  }
  const buckets = getBuckets(period, range, dayHours);

  // Считаем ТОЛЬКО DONE — по зафиксированному с пользователем решению
  // (см. project_barbershop.md): PENDING/CONFIRMED могут не состояться,
  // CANCELLED не состоялась. Берём ВСЕ DONE-записи за всё время, а не
  // только за период — см. комментарий у computeAnalytics().
  const bookings = await prisma.booking.findMany({
    where: { status: "DONE" },
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      startsAt: true,
      services: { select: { priceCents: true } },
    },
  });
  const records = bookings.map((b) => ({
    id: b.id,
    clientName: b.clientName,
    clientPhone: b.clientPhone,
    startsAt: b.startsAt,
    revenueCents: b.services.reduce((sum, s) => sum + s.priceCents, 0),
  }));

  const result = computeAnalytics(records, range, buckets);

  return NextResponse.json({
    period: {
      type: range.type,
      startsAt: range.startsAt.toISOString(),
      endsAt: range.endsAt.toISOString(),
      label: range.label,
      anchor: range.anchor,
      prevAnchor: range.prevAnchor,
      nextAnchor: range.nextAnchor,
    },
    ...result,
  });
}
