// Аналитика админки — период/бакеты/агрегация. Чистые функции (без
// Prisma) специально: логику дат/группировки удобно проверить отдельно
// от похода в БД, а route.ts остаётся тонким — только запрос + вызов.
import { formatDateStr, parseDateStr, zonedTimeToUtc } from "./shop-time";

export type Period = "day" | "week" | "month" | "year";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// Календарная арифметика над "YYYY-MM-DD" — намеренно БЕЗ обращения к
// часовому поясу (тот же принцип, что и у localWeekday в shop-time.ts):
// "какой день будет через N дней после 2026-08-04" не зависит от того,
// в каком поясе на это смотреть.
function addDays(dateStr: string, days: number): string {
  const { y, m, d } = parseDateStr(dateStr);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return formatDateStr(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
// 0=вс..6=сб (как parseDateStr/Date#getUTCDay) -> смещение от ближайшего
// ПОНЕДЕЛЬНИКА этой же недели, т.к. неделя в этом проекте считается
// Пн–Вс (принято с пользователем при обсуждении архитектуры).
function isoMondayOffset(weekday: number): number {
  return (weekday + 6) % 7;
}
function weekdayOf(dateStr: string): number {
  const { y, m, d } = parseDateStr(dateStr);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const WEEKDAY_SHORT_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTH_SHORT_RU = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const MONTH_FULL_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
// Родительный падеж ("21 АВГУСТА", не "21 Август") — нужен отдельно от
// MONTH_FULL_RU (тот — именительный, для заголовка "Август 2026").
const MONTH_GENITIVE_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export interface PeriodRange {
  type: Period;
  /// Границы периода в UTC, ready to use в Prisma-запросе (startsAt >=,
  /// endsAt <).
  startsAt: Date;
  endsAt: Date;
  anchor: string;
  prevAnchor: string;
  nextAnchor: string;
  label: string;
}

/// anchorDateStr — любая дата ВНУТРИ желаемого периода ("YYYY-MM-DD" в
/// SHOP_TIMEZONE), не обязательно его начало — день/неделя/месяц/год,
/// в который она попадает, вычисляются здесь.
export function getPeriodRange(period: Period, anchorDateStr: string): PeriodRange {
  const { y, m, d } = parseDateStr(anchorDateStr);

  if (period === "day") {
    return {
      type: period,
      startsAt: zonedTimeToUtc(anchorDateStr, 0),
      endsAt: zonedTimeToUtc(anchorDateStr, 24 * 60),
      anchor: anchorDateStr,
      prevAnchor: addDays(anchorDateStr, -1),
      nextAnchor: addDays(anchorDateStr, 1),
      label: `${d} ${MONTH_GENITIVE_RU[m - 1]} ${y}`,
    };
  }

  if (period === "week") {
    const monday = addDays(anchorDateStr, -isoMondayOffset(weekdayOf(anchorDateStr)));
    const sunday = addDays(monday, 6);
    const { m: sm, d: sd } = parseDateStr(monday);
    const { y: ey, m: em, d: ed } = parseDateStr(sunday);
    // "18–24 авг 2026" в общем случае, "28 июл – 3 авг 2026" на стыке
    // месяцев. Стык года внутри одной недели — крайний случай (год
    // повторится дважды в подписи), сознательно не усложняем ради него.
    const label =
      sm === em
        ? `${sd}–${ed} ${MONTH_SHORT_RU[em - 1].toLowerCase()} ${ey}`
        : `${sd} ${MONTH_SHORT_RU[sm - 1].toLowerCase()} – ${ed} ${MONTH_SHORT_RU[em - 1].toLowerCase()} ${ey}`;
    return {
      type: period,
      startsAt: zonedTimeToUtc(monday, 0),
      endsAt: zonedTimeToUtc(addDays(sunday, 1), 0),
      anchor: anchorDateStr,
      prevAnchor: addDays(monday, -7),
      nextAnchor: addDays(monday, 7),
      label,
    };
  }

  if (period === "month") {
    const monthStart = formatDateStr(y, m, 1);
    const nextMonthStart = m === 12 ? formatDateStr(y + 1, 1, 1) : formatDateStr(y, m + 1, 1);
    const prevMonthStart = m === 1 ? formatDateStr(y - 1, 12, 1) : formatDateStr(y, m - 1, 1);
    return {
      type: period,
      startsAt: zonedTimeToUtc(monthStart, 0),
      endsAt: zonedTimeToUtc(nextMonthStart, 0),
      anchor: anchorDateStr,
      prevAnchor: prevMonthStart,
      nextAnchor: nextMonthStart,
      label: `${MONTH_FULL_RU[m - 1]} ${y}`,
    };
  }

  // year
  const yearStart = formatDateStr(y, 1, 1);
  const nextYearStart = formatDateStr(y + 1, 1, 1);
  return {
    type: period,
    startsAt: zonedTimeToUtc(yearStart, 0),
    endsAt: zonedTimeToUtc(nextYearStart, 0),
    anchor: anchorDateStr,
    prevAnchor: formatDateStr(y - 1, 1, 1),
    nextAnchor: nextYearStart,
    label: String(y),
  };
}

export interface Bucket {
  key: string;
  label: string;
  startsAt: Date;
  endsAt: Date;
}

/// dayHours — рабочие часы АНКОРНОГО дня (только для period="day"),
/// null если день выходной/не задан. Route.ts подтягивает это из
/// WorkingHours — сама функция ничего не знает про БД.
export function getBuckets(period: Period, range: PeriodRange, dayHours: { startMinute: number; endMinute: number } | null): Bucket[] {
  if (period === "day") {
    if (!dayHours) return [];
    const buckets: Bucket[] = [];
    const startHour = Math.floor(dayHours.startMinute / 60);
    const endHour = Math.ceil(dayHours.endMinute / 60);
    for (let h = startHour; h < endHour; h++) {
      buckets.push({
        key: String(h),
        label: `${pad2(h)}:00`,
        startsAt: zonedTimeToUtc(range.anchor, h * 60),
        endsAt: zonedTimeToUtc(range.anchor, (h + 1) * 60),
      });
    }
    return buckets;
  }

  if (period === "week") {
    const buckets: Bucket[] = [];
    const monday = addDays(range.anchor, -isoMondayOffset(weekdayOf(range.anchor)));
    let dateStr = monday;
    for (let i = 0; i < 7; i++) {
      buckets.push({
        key: dateStr,
        label: WEEKDAY_SHORT_RU[weekdayOf(dateStr)],
        startsAt: zonedTimeToUtc(dateStr, 0),
        endsAt: zonedTimeToUtc(dateStr, 24 * 60),
      });
      dateStr = addDays(dateStr, 1);
    }
    return buckets;
  }

  if (period === "month") {
    const { y, m } = parseDateStr(range.anchor);
    const total = daysInMonth(y, m);
    const buckets: Bucket[] = [];
    for (let day = 1; day <= total; day++) {
      const dateStr = formatDateStr(y, m, day);
      buckets.push({
        key: dateStr,
        label: String(day),
        startsAt: zonedTimeToUtc(dateStr, 0),
        endsAt: zonedTimeToUtc(dateStr, 24 * 60),
      });
    }
    return buckets;
  }

  // year
  const { y } = parseDateStr(range.anchor);
  const buckets: Bucket[] = [];
  for (let m = 1; m <= 12; m++) {
    const monthStart = formatDateStr(y, m, 1);
    const nextMonthStart = m === 12 ? formatDateStr(y + 1, 1, 1) : formatDateStr(y, m + 1, 1);
    buckets.push({
      key: `${y}-${pad2(m)}`,
      label: MONTH_SHORT_RU[m - 1],
      startsAt: zonedTimeToUtc(monthStart, 0),
      endsAt: zonedTimeToUtc(nextMonthStart, 0),
    });
  }
  return buckets;
}

export interface DoneBookingRecord {
  id: string;
  clientName: string;
  /// NULL — запись внесена барбером вручную (source=MANUAL, см. Booking
  /// в schema.prisma), уличный клиент часто не оставляет номер. См.
  /// identityKey() ниже — как это учитывается при подсчёте клиентов.
  clientPhone: string | null;
  startsAt: Date;
  revenueCents: number;
}

/// Ключ группировки "один и тот же клиент" для подсчёта уникальных/новых
/// клиентов. Записи БЕЗ телефона нельзя схлопывать друг с другом как
/// одного человека — мы физически не можем это проверить, а ошибочно
/// объединить двух РАЗНЫХ людей в аналитике хуже, чем недосчитать
/// повторного анонимного визита (редкий случай). Синтетический ключ на
/// основе id брони гарантированно уникален и никогда не повторяется —
/// благодаря этому такая запись автоматически проходит через ОБЩУЮ
/// логику ниже (подсчёт клиентов/новых клиентов) как "клиент, которого
/// видим первый и единственный раз", без отдельных if-веток на null.
function identityKey(b: DoneBookingRecord): string {
  return b.clientPhone ?? `__anon_${b.id}__`;
}

export interface SeriesPoint {
  key: string;
  label: string;
  bookingsCount: number;
  revenueCents: number;
}

export interface TopClient {
  phone: string;
  name: string;
  bookingsCount: number;
  revenueCents: number;
}

export interface AnalyticsResult {
  totals: { bookingsCount: number; clientsCount: number; newClientsCount: number; revenueCents: number };
  series: SeriesPoint[];
  topClients: TopClient[];
}

/// allDoneBookings — ВСЕ записи со статусом DONE за всё время (не только
/// период) — нужны целиком, чтобы (а) корректно определить "новых"
/// клиентов (первый визит мог быть до периода) и (б) посчитать топ
/// клиентов за всё время одним проходом без похода в БД дважды.
export function computeAnalytics(
  allDoneBookings: DoneBookingRecord[],
  range: PeriodRange,
  buckets: Bucket[],
): AnalyticsResult {
  const firstVisit = new Map<string, number>();
  for (const b of allDoneBookings) {
    const key = identityKey(b);
    const t = b.startsAt.getTime();
    const prev = firstVisit.get(key);
    if (prev === undefined || t < prev) firstVisit.set(key, t);
  }

  const rangeStart = range.startsAt.getTime();
  const rangeEnd = range.endsAt.getTime();
  const periodBookings = allDoneBookings.filter((b) => {
    const t = b.startsAt.getTime();
    return t >= rangeStart && t < rangeEnd;
  });

  const clientsInPeriod = new Set(periodBookings.map((b) => identityKey(b)));
  let newClientsCount = 0;
  for (const key of clientsInPeriod) {
    const first = firstVisit.get(key);
    if (first !== undefined && first >= rangeStart && first < rangeEnd) newClientsCount++;
  }

  const series: SeriesPoint[] = buckets.map((bkt) => ({ key: bkt.key, label: bkt.label, bookingsCount: 0, revenueCents: 0 }));
  for (const b of periodBookings) {
    const t = b.startsAt.getTime();
    // Бакеты покрывают весь период сплошь без пропусков (см. getBuckets) —
    // find() почти всегда находит совпадение; запись без бакета (день без
    // рабочих часов, но с исторической DONE-записью — редкий край) просто
    // не попадает на график, при этом totals ниже её всё равно учитывают.
    const idx = buckets.findIndex((bkt) => t >= bkt.startsAt.getTime() && t < bkt.endsAt.getTime());
    if (idx !== -1) {
      series[idx].bookingsCount += 1;
      series[idx].revenueCents += b.revenueCents;
    }
  }

  const byPhone = new Map<string, { name: string; nameAt: number; bookingsCount: number; revenueCents: number }>();
  for (const b of allDoneBookings) {
    // Без телефона — не участвует в топе клиентов (в отличие от
    // clientsCount/newClientsCount выше, где такая запись честно
    // учитывается как отдельный анонимный клиент). Топ — рейтинг
    // ПОСТОЯННЫХ клиентов по накопленной истории визитов; у анонимной
    // записи такой истории физически нет и быть не может (это разовая
    // walk-in-запись без идентификатора), ранжировать её было бы
    // бессмысленно — попала бы в список как "клиент с 1 визитом",
    // засоряя топ одноразовыми строками вместо реальных постоянных
    // клиентов. Деньги (totals.revenueCents выше) при этом никуда не
    // пропадают — просто не привязаны к конкретному имени в топе.
    if (!b.clientPhone) continue;
    const entry = byPhone.get(b.clientPhone);
    const t = b.startsAt.getTime();
    if (!entry) {
      byPhone.set(b.clientPhone, { name: b.clientName, nameAt: t, bookingsCount: 1, revenueCents: b.revenueCents });
    } else {
      entry.bookingsCount += 1;
      entry.revenueCents += b.revenueCents;
      // Имя берём с САМОЙ ПОЗДНЕЙ записи этого телефона — если клиент
      // представлялся по-разному, показываем актуальный вариант.
      if (t >= entry.nameAt) {
        entry.name = b.clientName;
        entry.nameAt = t;
      }
    }
  }
  const topClients: TopClient[] = [...byPhone.entries()]
    .map(([phone, v]) => ({ phone, name: v.name, bookingsCount: v.bookingsCount, revenueCents: v.revenueCents }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 10);

  return {
    totals: {
      bookingsCount: periodBookings.length,
      clientsCount: clientsInPeriod.size,
      newClientsCount,
      revenueCents: periodBookings.reduce((sum, b) => sum + b.revenueCents, 0),
    },
    series,
    topClients,
  };
}
