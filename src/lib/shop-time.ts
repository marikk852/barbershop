// Часовой пояс барбершопа — используется и на сервере (API-роуты слотов),
// и в браузере (календарь считает, какие дни в прошлом/выходные ровно так
// же, как сервер) — поэтому файл не трогает Prisma и не помечен "server
// only", чтобы его можно было импортировать в клиентский компонент.
export const SHOP_TIMEZONE = "Europe/Chisinau";

// Фиксированная длительность слота. Настоящая длительность зависит от
// выбранной услуги (в прайсе — 25 до 65 мин), но выбор услуги в календарь
// пока не подключён (отдельная задача) — 30 мин достаточно, чтобы честно
// показать сетку времени уже сейчас, не блокируясь на этом шаге.
export const SLOT_MINUTES = 30;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/// "YYYY-MM-DD" -> {y, m, d} без какой-либо привязки к таймзоне — это
/// просто разбор календарной даты, чем она и остаётся до тех пор, пока не
/// понадобится конкретный момент времени (см. zonedTimeToUtc).
export function parseDateStr(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

export function formatDateStr(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/// День недели календарной даты — 0=воскресенье..6=суббота (как
/// WorkingHours.weekday и JS Date#getDay). Намеренно БЕЗ учёта таймзоны:
/// "какой день недели у 2026-08-04" не зависит от того, в каком поясе на
/// это смотреть — только от календаря.
export function localWeekday(dateStr: string): number {
  const { y, m, d } = parseDateStr(dateStr);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/// Момент времени в UTC, соответствующий "dateStr в SHOP_TIMEZONE, столько-то
/// минут от полуночи". Классический двойной-форматтер трюк: сперва считаем
/// момент ТАК, будто он был бы в UTC, затем смотрим, какое время это даёт в
/// нужном поясе, и правим на разницу — учитывает переход на летнее/зимнее
/// время автоматически (ICU-данные уже есть в Node/браузере, отдельная
/// библиотека не нужна). Игнорирует несуществующий/двойной час в момент
/// самого перехода DST — для записи в барбершоп это не критично.
export function zonedTimeToUtc(dateStr: string, minutesFromMidnight: number): Date {
  const { y, m, d } = parseDateStr(dateStr);
  const hh = Math.floor(minutesFromMidnight / 60);
  const mm = minutesFromMidnight % 60;
  const guessUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0);

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(guessUtcMs)).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  // "24" на месте часа — особенность some Intl-реализаций для полуночи
  // при hour12:false; трактуем как 0.
  const hourPart = parts.hour === "24" ? 0 : Number(parts.hour);
  const asIfLocalMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hourPart,
    Number(parts.minute),
    Number(parts.second),
  );
  const offsetMs = asIfLocalMs - guessUtcMs;
  return new Date(guessUtcMs - offsetMs);
}

/// "Сегодня" в часовом поясе барбершопа, как "YYYY-MM-DD" — не то же
/// самое, что "сегодня" на сервере/в браузере пользователя, если тот
/// смотрит сайт из другого пояса.
export function todayInShopTz(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TIMEZONE });
  return fmt.format(new Date()); // en-CA -> "YYYY-MM-DD"
}

export interface WorkingHoursRow {
  weekday: number;
  startMinute: number;
  endMinute: number;
  closed: boolean;
}

export interface TimeOffRange {
  startsAt: string; // ISO
  endsAt: string; // ISO
}

/// День целиком недоступен для записи, если для его дня недели график
/// закрыт, либо если единичная блокировка (TimeOff) целиком перекрывает
/// рабочие часы этого дня. Короткие блокировки (обед и т.п.) день не
/// закрывают — только видимость части времени в /api/booking/slots.
export function isDayFullyBlocked(dateStr: string, hours: WorkingHoursRow[], timeOff: TimeOffRange[]): boolean {
  const weekday = localWeekday(dateStr);
  const wh = hours.find((h) => h.weekday === weekday);
  if (!wh || wh.closed) return true;

  const dayStart = zonedTimeToUtc(dateStr, wh.startMinute).getTime();
  const dayEnd = zonedTimeToUtc(dateStr, wh.endMinute).getTime();
  return timeOff.some((t) => new Date(t.startsAt).getTime() <= dayStart && new Date(t.endsAt).getTime() >= dayEnd);
}
