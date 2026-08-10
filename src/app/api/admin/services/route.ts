import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, requireAdmin } from "@/lib/telegram-auth";

// slug — технический идентификатор (не показывается в UI), но модель
// требует его @unique — генерируем из русского названия транслитом,
// а не просим админа вводить вручную (лишнее поле для не-технического
// пользователя). При коллизии — добавляем счётчик.
const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};
function slugify(input: string): string {
  const translit = input
    .toLowerCase()
    .split("")
    .map((ch) => CYRILLIC_MAP[ch] ?? ch)
    .join("");
  return (
    translit
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "service"
  );
}
async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 2;
  // Число услуг в барбершопе — единицы, коллизии — редкий крайний
  // случай; простой цикл вместо более хитрой логики оправдан.
  while (await prisma.service.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

interface ServiceBody {
  nameRu?: string;
  nameRo?: string;
  durationMin?: number;
  priceCents?: number;
  order?: number;
  active?: boolean;
}

export async function GET(request: Request) {
  const auth = requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const services = await prisma.service.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  const auth = requireAdmin(getInitDataFromRequest(request));
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const body = (await request.json().catch(() => null)) as ServiceBody | null;
  const nameRu = body?.nameRu?.trim();
  const nameRo = body?.nameRo?.trim();
  const durationMin = body?.durationMin;
  const priceCents = body?.priceCents;
  if (!nameRu || !nameRo || !durationMin || durationMin <= 0 || priceCents == null || priceCents < 0) {
    return NextResponse.json(
      { error: "nameRu, nameRo, durationMin (>0) and priceCents (>=0) are required" },
      { status: 400 },
    );
  }

  const slug = await uniqueSlug(slugify(nameRu));
  // Новая услуга — в конец списка по умолчанию (order = текущий максимум + 1),
  // если order явно не передан.
  const order = body?.order ?? ((await prisma.service.aggregate({ _max: { order: true } }))._max.order ?? -1) + 1;

  const service = await prisma.service.create({
    data: { slug, nameRu, nameRo, durationMin, priceCents, order, active: body?.active ?? true },
  });
  return NextResponse.json({ service }, { status: 201 });
}
