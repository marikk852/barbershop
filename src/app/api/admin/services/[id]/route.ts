import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";

interface ServiceBody {
  nameRu?: string;
  nameRo?: string;
  durationMin?: number;
  priceCents?: number;
  order?: number;
  active?: boolean;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as ServiceBody | null;
  if (!body) return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });

  // Частичное обновление — берём только явно переданные поля, не
  // затираем остальное undefined'ами (Prisma сама пропускает undefined
  // в data, так что этого достаточно, но проверяем разумные пределы у
  // числовых полей, если они пришли).
  if (body.durationMin != null && body.durationMin <= 0) {
    return NextResponse.json({ error: "durationMin must be > 0" }, { status: 400 });
  }
  if (body.priceCents != null && body.priceCents < 0) {
    return NextResponse.json({ error: "priceCents must be >= 0" }, { status: 400 });
  }

  try {
    const service = await prisma.service.update({
      where: { id },
      data: {
        nameRu: body.nameRu?.trim(),
        nameRo: body.nameRo?.trim(),
        durationMin: body.durationMin,
        priceCents: body.priceCents,
        order: body.order,
        active: body.active,
      },
    });
    return NextResponse.json({ service });
  } catch {
    return NextResponse.json({ error: "service not found" }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Booking.serviceId -> Service имеет onDelete: Restrict (см. schema)
    // — у услуги есть записи, удалить нельзя без потери истории.
    // P2003 (foreign key constraint) — предлагаем деактивировать вместо
    // удаления, а не просто "ошибка".
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2003" || e.code === "P2014")) {
      return NextResponse.json(
        { error: "у услуги есть записи клиентов — удалить нельзя, деактивируйте вместо этого" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "service not found" }, { status: 404 });
  }
}
