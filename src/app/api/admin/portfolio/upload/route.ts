import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";

// Клиентская загрузка (upload() из @vercel/blob/client, см.
// admin/portfolio/page.tsx) — байты файла идут НАПРЯМУЮ из браузера в
// Blob-хранилище, минуя эту serverless-функцию. Это не опционально:
// Vercel Serverless Functions жёстко ограничены ~4.5МБ на тело запроса
// на уровне платформы (не настраивается в Next.js) — фото с телефона
// (часто 5-12МБ) не прошли бы через обычный "загрузи файл в API-роут"
// эндпоинт. Эта функция лишь ВЫДАЁТ короткоживущий токен на загрузку —
// именно поэтому проверка авторизации здесь так же обязательна, как и
// на остальных /api/admin/* — без неё кто угодно с URL получил бы токен
// на запись в хранилище.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const auth = requireAdmin(getInitDataFromRequest(request));
        if (!auth.ok) {
          throw new Error(auth.reason);
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
          addRandomSuffix: true,
          maximumSizeInBytes: 20 * 1024 * 1024, // 20МБ — с запасом под фото с телефона
        };
      },
      // Специально НЕ создаём тут PortfolioItem-запись: onUploadCompleted
      // вызывается САМИМ Vercel Blob по HTTP-колбэку и требует публично
      // достижимого URL — ненадёжно на localhost при разработке. Вместо
      // этого клиент, получив итоговый url от upload(), сам вызывает
      // POST /api/admin/portfolio (см. страницу) — тот же принцип, что и
      // у остального CRUD: один явный, тестируемый запрос вместо скрытого
      // асинхронного колбэка.
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "upload failed" }, { status: 400 });
  }
}
