import { NextResponse } from "next/server";
import { ALLOWED_BOOKING_STATUSES, applyBookingStatus, type AllowedBookingStatus } from "@/lib/booking-status";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status;
  if (!status || !ALLOWED_BOOKING_STATUSES.includes(status as AllowedBookingStatus)) {
    return NextResponse.json({ error: `status must be one of: ${ALLOWED_BOOKING_STATUSES.join(", ")}` }, { status: 400 });
  }

  // Валидация статуса/аутентификация — здесь (HTTP-специфичные заботы).
  // Сама смена статуса + рассылка уведомлений (email, Telegram клиенту,
  // редактирование сообщения барберу) — общая с Telegram-кнопками
  // подтверждения, см. applyBookingStatus.
  const result = await applyBookingStatus(id, status as AllowedBookingStatus);
  if (!result.ok) {
    return NextResponse.json({ error: "booking not found" }, { status: 404 });
  }

  return NextResponse.json({ booking: { id: result.id, status: result.status } });
}
