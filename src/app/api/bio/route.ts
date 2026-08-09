import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// То же, что читает src/app/[locale]/bio/page.tsx напрямую из Prisma —
// нужно и клиентскому попапу "Биография" (SiteScene — клиентский
// компонент, серверный Prisma-запрос оттуда не позвать напрямую).
export async function GET() {
  const content = await prisma.siteContent.findUnique({ where: { id: 1 } });
  return NextResponse.json({
    bioRu: content?.bioRu ?? "",
    bioRo: content?.bioRo ?? "",
    address: content?.address ?? null,
    // phone/instagram/telegramUsername лежали в модели неиспользуемыми —
    // отдаём их тоже, попап сам решает, показывать бейдж или нет (null
    // сейчас, т.к. в seed их ещё нет — заполнятся, когда придут реальные
    // контакты от барбера).
    phone: content?.phone ?? null,
    instagram: content?.instagram ?? null,
    telegramUsername: content?.telegramUsername ?? null,
  });
}
