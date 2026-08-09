import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";

const ALLOWED_STATUSES = ["CONFIRMED", "CANCELLED", "DONE"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status;
  if (!status || !ALLOWED_STATUSES.includes(status as AllowedStatus)) {
    return NextResponse.json({ error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` }, { status: 400 });
  }

  try {
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: status as AllowedStatus },
    });
    return NextResponse.json({ booking: { id: updated.id, status: updated.status } });
  } catch {
    // Prisma кидает при "запись не найдена" (P2025) — единственный
    // реалистичный сценарий ошибки здесь (id из URL, не запрос);
    // не разбираем код конкретно, 404 корректен в обоих смыслах.
    return NextResponse.json({ error: "booking not found" }, { status: 404 });
  }
}
