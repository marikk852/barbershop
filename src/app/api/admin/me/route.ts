import { NextResponse } from "next/server";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";

// Единая точка, откуда AdminShell узнаёт "пускать ли вообще в /admin"
// (гейт — см. AdminShell.tsx) и "показывать ли вкладку Доступ"
// (isOwner). Ничего не пишет и не читает из БД сверх того, что уже
// делает requireAdmin() — просто оборачивает её в удобный для клиента
// ответ.
export async function GET(request: Request) {
  const auth = await requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }
  const ownerId = process.env.ADMIN_TELEGRAM_ID;
  return NextResponse.json({
    isOwner: String(auth.user.id) === ownerId,
    user: { id: auth.user.id, username: auth.user.username ?? null, firstName: auth.user.firstName },
  });
}
