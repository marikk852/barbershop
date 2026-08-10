import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";

interface UpdateBody {
  bioRu?: string;
  bioRo?: string;
  phone?: string | null;
  instagram?: string | null;
  telegramUsername?: string | null;
  address?: string | null;
}

// SiteContent — singleton (id всегда 1, см. schema.prisma), поэтому нет
// отдельной [id]-ручки: GET/PATCH тут работают с единственной строкой.
export async function GET(request: Request) {
  const auth = requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const content = await prisma.siteContent.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  return NextResponse.json({ content });
}

export async function PATCH(request: Request) {
  const auth = requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const body = (await request.json().catch(() => null)) as UpdateBody | null;
  if (!body) return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });

  const data = {
    bioRu: body.bioRu?.trim(),
    bioRo: body.bioRo?.trim(),
    phone: body.phone === undefined ? undefined : body.phone?.trim() || null,
    instagram: body.instagram === undefined ? undefined : body.instagram?.trim() || null,
    telegramUsername: body.telegramUsername === undefined ? undefined : body.telegramUsername?.trim() || null,
    address: body.address === undefined ? undefined : body.address?.trim() || null,
  };

  const content = await prisma.siteContent.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  return NextResponse.json({ content });
}
