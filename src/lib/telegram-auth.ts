import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Проверка initData Telegram Mini App — единственный механизм авторизации
// админки (без пароля, без сессий/cookie): пользователь открывает Mini App
// через кнопку бота, Telegram сам подписывает данные о нём, мы на сервере
// сверяем подпись и id. Алгоритм — ровно как в официальной документации
// (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app):
//   secret_key = HMAC_SHA256(key="WebAppData", data=botToken)
//   hash       = HMAC_SHA256(key=secret_key,  data=data_check_string)
// data_check_string — все поля initData КРОМЕ hash, отсортированные по
// ключу, в виде "key=value", склеенные через "\n".
export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
}

export type VerifyResult = { ok: true; user: TelegramUser } | { ok: false; reason: string };

// initData "протухает" — Telegram переподписывает его при каждом открытии
// Mini App, но если кто-то перехватит и будет реиспользовать старую
// строку часами/днями спустя, это уже подозрительно. 24 часа — обычный
// консервативный запас (человек мог держать Mini App открытым долго).
const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

export function verifyTelegramInitData(initData: string, botToken: string): VerifyResult {
  if (!initData) return { ok: false, reason: "empty initData" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "no hash in initData" };
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  // timingSafeEqual требует равной длины буферов — hex-строка фиксированной
  // длины (64 символа для sha256), но на случай мусора во входных данных
  // (не 64 hex-символа) сравниваем длины явно до вызова, а не ловим throw.
  const computedBuf = Buffer.from(computedHash, "hex");
  const givenBuf = Buffer.from(hash, "hex");
  if (computedBuf.length !== givenBuf.length || !timingSafeEqual(computedBuf, givenBuf)) {
    return { ok: false, reason: "signature mismatch" };
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, reason: "auth_date expired" };
  }

  const userRaw = params.get("user");
  if (!userRaw) return { ok: false, reason: "no user in initData" };
  let userJson: { id: number; first_name: string; last_name?: string; username?: string };
  try {
    userJson = JSON.parse(userRaw);
  } catch {
    return { ok: false, reason: "malformed user JSON" };
  }

  return {
    ok: true,
    user: {
      id: userJson.id,
      firstName: userJson.first_name,
      lastName: userJson.last_name,
      username: userJson.username,
    },
  };
}

// Собранная проверка "это вообще валидный Telegram-пользователь" +
// "у него есть доступ к админке" — ровно то, что нужно на каждом
// /api/admin/* эндпоинте. Один explicit reason на выходе вместо булева,
// чтобы 401-ответы были осмысленными при отладке.
//
// Два уровня допуска:
//  1. Владелец (ADMIN_TELEGRAM_ID из env) — доступ всегда, БЕЗ обращения
//     к таблице AdminUser. Так барбер не может сам себя случайно
//     заблокировать, если таблица пуста/повреждена/недоступна.
//  2. Любой другой Telegram-аккаунт — только если для его telegramId в
//     AdminUser стоит status=ACTIVE (владелец выдаёт это вручную на
//     экране /admin/users).
// Побочный эффект: если подпись initData подлинная (Telegram однозначно
// подтвердил личность), но аккаунт не в списке — заводим/обновляем для
// него запись. Два случая:
//  a) Владелец заранее "забронировал" доступ по нику (POST
//     /api/admin/users {username} — telegramId тогда ещё null, Telegram
//     НЕ даёт боту узнать id по одному только username, это ограничение
//     платформы, не наш выбор). При совпадении username — привязываем
//     telegramId к этой брони, доступ действует сразу же, без участия
//     владельца на этом шаге.
//  b) Совпадения нет — заводим обычную PENDING-запись. Владелец увидит
//     её в /admin/users и выдаст доступ вручную.
export async function requireAdmin(initData: string | null): Promise<VerifyResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const ownerId = process.env.ADMIN_TELEGRAM_ID;
  if (!botToken || !ownerId) {
    return { ok: false, reason: "server misconfigured: missing TELEGRAM_BOT_TOKEN/ADMIN_TELEGRAM_ID" };
  }
  if (!initData) return { ok: false, reason: "missing initData" };

  const result = verifyTelegramInitData(initData, botToken);
  if (!result.ok) return result;

  if (String(result.user.id) === ownerId) return result;

  const telegramId = String(result.user.id);
  const username = result.user.username ?? null;
  const freshNames = { firstName: result.user.firstName, lastName: result.user.lastName ?? null };

  let record = await prisma.adminUser.findUnique({ where: { telegramId } });

  if (record) {
    // Обычный повторный визит — освежаем имя/username (могли смениться
    // с прошлого раза), status НЕ трогаем: update не должен тихо
    // понижать уже выданный ACTIVE обратно в PENDING.
    record = await prisma.adminUser.update({ where: { id: record.id }, data: { username, ...freshNames } });
  } else {
    const claim = username
      ? await prisma.adminUser.findFirst({ where: { telegramId: null, username: { equals: username, mode: "insensitive" } } })
      : null;
    record = claim
      ? await prisma.adminUser.update({ where: { id: claim.id }, data: { telegramId, ...freshNames } })
      : await prisma.adminUser.upsert({
          where: { telegramId },
          create: { telegramId, username, ...freshNames },
          update: { username, ...freshNames },
        });
  }

  if (record.status !== "ACTIVE") {
    return { ok: false, reason: "not admin" };
  }
  return result;
}

// Более узкая проверка для /api/admin/users/* — управлять списком
// допущенных аккаунтов может ТОЛЬКО владелец (иначе выданный доступ
// админ мог бы сам себе выдать больше прав или отозвать доступ у
// владельца).
export async function requireOwner(initData: string | null): Promise<VerifyResult> {
  const result = await requireAdmin(initData);
  if (!result.ok) return result;
  const ownerId = process.env.ADMIN_TELEGRAM_ID;
  if (String(result.user.id) !== ownerId) {
    return { ok: false, reason: "owner only" };
  }
  return result;
}

// Конвенция самого Telegram (и @telegram-apps/sdk): initData передаётся в
// заголовке `Authorization: tma <initData>`. Клиент — единая точка, не
// дублировать этот формат в каждом API-роуте.
export function getInitDataFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const [scheme, ...rest] = auth.split(" ");
  if (scheme?.toLowerCase() !== "tma") return null;
  return rest.join(" ") || null;
}
