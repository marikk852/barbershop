import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// То же, что читает src/app/[locale]/portfolio/page.tsx — нужно и попапу
// "Портфолио" (см. src/app/api/bio/route.ts почему через API-роут).
export async function GET() {
  const items = await prisma.portfolioItem.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      imageUrl: i.imageUrl,
      captionRu: i.captionRu,
      captionRo: i.captionRo,
      width: i.width,
      height: i.height,
    })),
  });
}
