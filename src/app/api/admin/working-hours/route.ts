import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";

interface UpdateRow {
  weekday: number;
  startMinute: number;
  endMinute: number;
  closed: boolean;
}

// WorkingHours — фиксированный набор из 7 строк (по одной на weekday,
// 0=вс..6=сб, засеяно один раз в prisma/seed.ts), поэтому здесь нет
// create/delete — только чтение и upsert по weekday.
export async function GET(request: Request) {
  const auth = requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const rows = await prisma.workingHours.findMany({ orderBy: { weekday: "asc" } });
  return NextResponse.json({ rows });
}

// Принимает массив строк целиком (админ правит весь график разом на одном
// экране) — проще и надёжнее одного PATCH на weekday при потере сети
// посреди серии запросов.
export async function PATCH(request: Request) {
  const auth = requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { rows?: UpdateRow[] } | null;
  const rows = body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows: непустой массив обязателен" }, { status: 400 });
  }
  for (const r of rows) {
    if (
      typeof r.weekday !== "number" || r.weekday < 0 || r.weekday > 6 ||
      typeof r.startMinute !== "number" || r.startMinute < 0 || r.startMinute > 1440 ||
      typeof r.endMinute !== "number" || r.endMinute < 0 || r.endMinute > 1440 ||
      typeof r.closed !== "boolean"
    ) {
      return NextResponse.json({ error: `некорректная строка графика для weekday=${r.weekday}` }, { status: 400 });
    }
    if (!r.closed && r.endMinute <= r.startMinute) {
      return NextResponse.json({ error: "время закрытия должно быть позже времени открытия" }, { status: 400 });
    }
  }

  await prisma.$transaction(
    rows.map((r) =>
      prisma.workingHours.upsert({
        where: { weekday: r.weekday },
        create: r,
        update: { startMinute: r.startMinute, endMinute: r.endMinute, closed: r.closed },
      }),
    ),
  );

  const updated = await prisma.workingHours.findMany({ orderBy: { weekday: "asc" } });
  return NextResponse.json({ rows: updated });
}
