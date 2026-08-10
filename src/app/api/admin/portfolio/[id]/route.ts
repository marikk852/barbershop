import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";

interface UpdateBody {
  captionRu?: string | null;
  captionRo?: string | null;
  order?: number;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as UpdateBody | null;
  if (!body) return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });

  try {
    const item = await prisma.portfolioItem.update({
      where: { id },
      data: {
        captionRu: body.captionRu === undefined ? undefined : body.captionRu?.trim() || null,
        captionRo: body.captionRo === undefined ? undefined : body.captionRo?.trim() || null,
        order: body.order,
      },
    });
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "photo not found" }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const { id } = await params;
  const item = await prisma.portfolioItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "photo not found" }, { status: 404 });

  await prisma.portfolioItem.delete({ where: { id } });
  // Файл в Blob-хранилище — отдельная сущность от записи в БД, сам не
  // удалится вместе с строкой. Удаляем ПОСЛЕ успешного удаления записи
  // (не наоборот): если бы файл удалился первым и запись почему-то не
  // удалилась, осталась бы "битая" ссылка на несуществующее фото — а
  // так, в худшем случае (падение между вызовами) — просто осиротевший
  // файл в хранилище, не показывающийся нигде, безвредно.
  try {
    await del(item.imageUrl);
  } catch {
    // Не проваливаем запрос из-за этого — запись в БД уже корректно
    // удалена, это главное; файл руками не подчистится, но это не
    // критично (место в Blob дешёвое, не как утечка в UI/данных).
  }

  return NextResponse.json({ ok: true });
}
