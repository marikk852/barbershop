import { prisma } from "@/lib/prisma";

// Лимиты и имя ловушки — в отдельном модуле без серверных импортов,
// чтобы клиентская форма (booking-flow.tsx) брала те же числа.
export { BOOKING_LIMITS, HONEYPOT_FIELD } from "@/lib/booking-limits";

// Защита публичной формы записи (POST /api/booking) от мусора и спама.
// Эндпоинт без авторизации, а каждая заявка занимает время в сетке И
// шлёт барберу сообщение в Telegram — без этих ограничений любой скрипт
// мог бы забить расписание фейковыми PENDING-заявками и засыпать бота.

/// Сколько активных (PENDING/CONFIRMED, ещё не наступивших) записей
/// может быть на один номер телефона одновременно. Реальному клиенту
/// больше 3 будущих визитов разом не нужно; спам-скрипт с одним
/// номером упирается сюда сразу.
const MAX_ACTIVE_PER_PHONE = 3;

export async function phoneHasTooManyActiveBookings(clientPhone: string): Promise<boolean> {
  const count = await prisma.booking.count({
    where: {
      clientPhone,
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { gt: new Date() },
    },
  });
  return count >= MAX_ACTIVE_PER_PHONE;
}

// Ограничение частоты по IP — best effort: счётчик живёт в памяти одного
// "тёплого" экземпляра serverless-функции, параллельные экземпляры на
// Vercel его не делят. От массовой атаки с ротацией экземпляров это не
// спасает (для этого нужен общий стор вроде Redis/KV), но обычный скрипт,
// долбящий форму в цикле, попадает в один и тот же тёплый экземпляр и
// упирается сюда. Лимит по телефону выше работает через БД и надёжен
// при любом числе экземпляров — эти два механизма дополняют друг друга.
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_REQUESTS = 5;
const ipHits = new Map<string, number[]>();

export function getClientIp(request: Request): string | null {
  // Vercel кладёт реальный IP клиента первым в x-forwarded-for.
  const xff = request.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
}

export function ipRateLimited(ip: string | null): boolean {
  if (!ip) return false;
  const now = Date.now();
  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  if (recent.length >= IP_MAX_REQUESTS) {
    ipHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipHits.set(ip, recent);
  // Не даём Map расти бесконечно на долгоживущем экземпляре.
  if (ipHits.size > 5000) {
    for (const [key, hits] of ipHits) {
      if (hits.every((t) => now - t >= IP_WINDOW_MS)) ipHits.delete(key);
    }
  }
  return false;
}

/// Сработал ли constraint Booking_no_overlap (EXCLUDE USING gist, см.
/// миграцию 20260801203411_init) — то есть вставку отклонила сама БД
/// из-за пересечения по времени. Раньше любой throw из
/// prisma.booking.create считался "время занято" — и реальный сбой БД
/// (недоступна, таймаут, ошибка схемы) молча превращался в ложное
/// "выберите другое время" без следа в логах. Форма ошибки зависит от
/// драйвера/версии Prisma, поэтому ищем имя constraint'а или SQLSTATE
/// 23P01 (exclusion_violation) по всему объекту ошибки, включая
/// вложенные cause/meta.
export function isOverlapViolation(err: unknown): boolean {
  const seen = new Set<unknown>();
  const walk = (v: unknown, depth: number): boolean => {
    if (v == null || depth > 4 || seen.has(v)) return false;
    if (typeof v === "string") return v.includes("Booking_no_overlap") || v.includes("23P01");
    if (typeof v !== "object") return false;
    seen.add(v);
    const obj = v as Record<string, unknown>;
    const keys = new Set([...Object.getOwnPropertyNames(obj), "message", "code", "meta", "cause"]);
    for (const k of keys) {
      let child: unknown;
      try {
        child = obj[k];
      } catch {
        continue;
      }
      if (walk(child, depth + 1)) return true;
    }
    return false;
  };
  return walk(err, 0);
}
