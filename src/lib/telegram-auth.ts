import { createHmac, timingSafeEqual } from "node:crypto";

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
// "это именно барбер, а не кто угодно с initData" — ровно то, что нужно
// на каждом /api/admin/* эндпоинте. Один explicit reason на выходе вместо
// булева, чтобы 401-ответы были осмысленными при отладке.
export function requireAdmin(initData: string | null): VerifyResult {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!botToken || !adminId) {
    return { ok: false, reason: "server misconfigured: missing TELEGRAM_BOT_TOKEN/ADMIN_TELEGRAM_ID" };
  }
  if (!initData) return { ok: false, reason: "missing initData" };

  const result = verifyTelegramInitData(initData, botToken);
  if (!result.ok) return result;

  if (String(result.user.id) !== adminId) {
    return { ok: false, reason: "not admin" };
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
