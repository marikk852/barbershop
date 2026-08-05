import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// То же, что читает src/app/[locale]/price/page.tsx — нужно и попапу
// "Прайс-лист" (см. src/app/api/bio/route.ts почему через API-роут).
export async function GET() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({
    services: services.map((s) => ({
      id: s.id,
      nameRu: s.nameRu,
      nameRo: s.nameRo,
      durationMin: s.durationMin,
      priceCents: s.priceCents,
    })),
  });
}
