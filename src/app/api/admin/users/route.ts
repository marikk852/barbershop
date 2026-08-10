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
  username?: string;
  firstName?: string;
}

// Добавление заранее — двумя способами:
//  a) telegramId (число) — когда он уже известен владельцу.
//  b) username (ник) — Telegram НЕ позволяет боту узнать numeric id по
//     одному только нику (антиспам-ограничение платформы, работает для
//     всех ботов без исключений), поэтому доступ активируется не сразу,
//     а автоматически при первом же входе человека с этим username (см.
//     requireAdmin() в lib/telegram-auth.ts) — до тех пор запись висит
//     с telegramId=null, видна в /admin/users как "ждёт первого входа".
export async function POST(request: Request) {
  const auth = await requireOwner(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const body = (await request.json().catch(() => null)) as CreateBody | null;
  const telegramId = body?.telegramId?.trim();
  const username = body?.username?.trim().replace(/^@/, "") || null;

  if (telegramId) {
    if (!/^\d+$/.test(telegramId)) {
      return NextResponse.json({ error: "telegramId: должен быть числом" }, { status: 400 });
    }
    if (telegramId === process.env.ADMIN_TELEGRAM_ID) {
      return NextResponse.json({ error: "это и так владелец — добавлять не нужно" }, { status: 400 });
    }
    const user = await prisma.adminUser.upsert({
      where: { telegramId },
      create: { telegramId, username, firstName: body?.firstName?.trim() || null, status: "ACTIVE" },
      update: { status: "ACTIVE" },
    });
    return NextResponse.json({ user }, { status: 201 });
  }

  if (username) {
    // Уже есть запись (реальная или бронь) с таким username — просто
    // убеждаемся, что она ACTIVE, вместо дублирования строки.
    const existing = await prisma.adminUser.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
    const user = existing
      ? await prisma.adminUser.update({ where: { id: existing.id }, data: { status: "ACTIVE" } })
      : await prisma.adminUser.create({ data: { username, firstName: body?.firstName?.trim() || null, status: "ACTIVE" } });
    return NextResponse.json({ user }, { status: 201 });
  }

  return NextResponse.json({ error: "укажите telegramId (число) или username (ник)" }, { status: 400 });
}
