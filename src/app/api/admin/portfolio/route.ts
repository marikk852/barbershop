import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";

interface CreateBody {
  imageUrl?: string;
  captionRu?: string;
  captionRo?: string;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const items = await prisma.portfolioItem.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ items });
}

// Создаёт ЗАПИСЬ о фото, которое уже загружено в Blob-хранилище (см.
// /api/admin/portfolio/upload — тот выдаёт токен для прямой загрузки
// из браузера, эта же ручка только сохраняет итоговый url в БД).
export async function POST(request: Request) {
  const auth = await requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const body = (await request.json().catch(() => null)) as CreateBody | null;
  const imageUrl = body?.imageUrl?.trim();
  if (!imageUrl || !imageUrl.startsWith("https://")) {
    return NextResponse.json({ error: "imageUrl (https URL) is required" }, { status: 400 });
  }

  const order = ((await prisma.portfolioItem.aggregate({ _max: { order: true } }))._max.order ?? -1) + 1;
  const item = await prisma.portfolioItem.create({
    data: { imageUrl, captionRu: body?.captionRu?.trim() || null, captionRo: body?.captionRo?.trim() || null, order },
  });
  return NextResponse.json({ item }, { status: 201 });
}
