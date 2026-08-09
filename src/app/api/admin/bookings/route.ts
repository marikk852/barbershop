import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";

// Список заявок для админки — новые/ожидающие первыми (барберу важнее
// всего разобрать очередь PENDING), внутри каждого статуса — по времени
// записи (startsAt), не по дате создания: барберу важно "что раньше
// состоится", а не "что раньше пришло".
const STATUS_ORDER: Record<string, number> = { PENDING: 0, CONFIRMED: 1, DONE: 2, CANCELLED: 3 };

export async function GET(request: Request) {
  const auth = requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    include: { service: { select: { nameRu: true, nameRo: true, durationMin: true, priceCents: true } } },
    orderBy: { startsAt: "asc" },
  });

  bookings.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      clientName: b.clientName,
      clientPhone: b.clientPhone,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      status: b.status,
      notes: b.notes,
      service: b.service,
    })),
  });
}
