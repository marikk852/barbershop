import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireOwner } from "@/lib/telegram-auth";

const ALLOWED_STATUSES = ["ACTIVE", "PENDING"] as const;

// PATCH — выдать (ACTIVE) или отозвать (PENDING, запись остаётся в
// истории) доступ. DELETE — убрать запись целиком (например, отклонённая
// заявка, которую незачем и дальше видеть в списке).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status;
  if (!status || !ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
    return NextResponse.json({ error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` }, { status: 400 });
  }

  try {
    const user = await prisma.adminUser.update({
      where: { id },
      data: { status: status as (typeof ALLOWED_STATUSES)[number] },
    });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "запись не найдена" }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.adminUser.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "запись не найдена" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
