import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireOwner } from "@/lib/telegram-auth";

// Управление списком допущенных в админку — доступно ТОЛЬКО владельцу
// (requireOwner, см. lib/telegram-auth.ts). PENDING-записи заводятся
// сами при попытках чужих аккаунтов открыть /admin (requireAdmin), эта
// ручка их только читает/переключает.
export async function GET(request: Request) {
  const auth = await requireOwner(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const users = await prisma.adminUser.findMany({ orderBy: [{ status: "asc" }, { updatedAt: "desc" }] });
  return NextResponse.json({ users });
}

interface CreateBody {
  telegramId?: string;
  firstName?: string;
}

// Предварительное добавление по известному telegramId — для случая,
// когда владелец заранее знает numeric id человека (например, тот уже
// присылал его для другой цели) и не хочет ждать, пока человек сам
// откроет бота.
export async function POST(request: Request) {
  const auth = await requireOwner(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const body = (await request.json().catch(() => null)) as CreateBody | null;
  const telegramId = body?.telegramId?.trim();
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json({ error: "telegramId: числовой Telegram user id обязателен" }, { status: 400 });
  }
  if (telegramId === process.env.ADMIN_TELEGRAM_ID) {
    return NextResponse.json({ error: "это и так владелец — добавлять не нужно" }, { status: 400 });
  }

  const user = await prisma.adminUser.upsert({
    where: { telegramId },
    create: { telegramId, firstName: body?.firstName?.trim() || null, status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });
  return NextResponse.json({ user }, { status: 201 });
}
