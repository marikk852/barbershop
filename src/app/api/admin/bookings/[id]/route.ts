import { NextResponse } from "next/server";
import { sendBookingStatusEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";

const ALLOWED_STATUSES = ["CONFIRMED", "CANCELLED", "DONE"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

// Статусы, при переходе В которые клиенту стоит написать письмо — не
// DONE (это внутренняя пометка барбера постфактум, клиенту неинтересна).
const EMAIL_ON_STATUS = new Set<AllowedStatus>(["CONFIRMED", "CANCELLED"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status;
  if (!status || !ALLOWED_STATUSES.includes(status as AllowedStatus)) {
    return NextResponse.json({ error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` }, { status: 400 });
  }

  let updated;
  try {
    updated = await prisma.booking.update({
      where: { id },
      data: { status: status as AllowedStatus },
      include: { service: { select: { nameRu: true, nameRo: true } } },
    });
  } catch {
    // Prisma кидает при "запись не найдена" (P2025) — единственный
    // реалистичный сценарий ошибки здесь (id из URL, не запрос);
    // не разбираем код конкретно, 404 корректен в обоих смыслах.
    return NextResponse.json({ error: "booking not found" }, { status: 404 });
  }

  // Письмо — best-effort уведомление, не часть транзакции подтверждения
  // записи: статус брони уже сохранён независимо от исхода отправки.
  // ВАЖНО: await, а не "fire and forget" — serverless-функция может быть
  // заморожена/убита сразу после отправки HTTP-ответа, недописанный
  // "void"-промис рисковал бы никогда не долететь до sendMail(). Сама
  // sendBookingStatusEmail() ошибки не бросает (ловит внутри и просто
  // возвращает {sent:false}), так что await здесь не может провалить
  // весь запрос — только притормозить ответ на время SMTP-раунтрипа.
  if (updated.clientEmail && EMAIL_ON_STATUS.has(status as AllowedStatus)) {
    await sendBookingStatusEmail(
      {
        clientEmail: updated.clientEmail,
        clientName: updated.clientName,
        serviceNameRu: updated.service.nameRu,
        serviceNameRo: updated.service.nameRo,
        startsAt: updated.startsAt,
      },
      status as "CONFIRMED" | "CANCELLED",
    );
  }

  return NextResponse.json({ booking: { id: updated.id, status: updated.status } });
}
