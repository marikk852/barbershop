import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";

interface CreateBody {
  startsAt?: string;
  endsAt?: string;
  reason?: string | null;
}

export async function GET(request: Request) {
  const auth = requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const items = await prisma.timeOff.findMany({ orderBy: { startsAt: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const body = (await request.json().catch(() => null)) as CreateBody | null;
  const startsAt = body?.startsAt ? new Date(body.startsAt) : null;
  const endsAt = body?.endsAt ? new Date(body.endsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime()) || !endsAt || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "startsAt/endsAt: корректные даты обязательны" }, { status: 400 });
  }
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "endsAt должен быть позже startsAt" }, { status: 400 });
  }

  const item = await prisma.timeOff.create({
    data: { startsAt, endsAt, reason: body?.reason?.trim() || null },
  });
  return NextResponse.json({ item }, { status: 201 });
}
