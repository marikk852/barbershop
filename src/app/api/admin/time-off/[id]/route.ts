import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";

// Только DELETE: блокировку времени (отпуск/обед) не редактируют — удаляют
// и создают заново с новыми датами, так проще и меньше состояний в UI.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.timeOff.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "блокировка не найдена" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
