import nodemailer, { type Transporter } from "nodemailer";
import type { Locale } from "@/i18n/routing";
import { intlLocale } from "@/lib/localized";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// Ленивая инициализация + переиспользование одного транспорта на все
// запросы serverless-функции (пока она "тёплая") — createTransport на
// каждое письмо не нужен, объект лёгкий и просто хранит конфигурацию
// SMTP-соединения.
let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    transporter = null;
    return null;
  }
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
  return transporter;
}

export interface BookingEmailData {
  clientEmail: string;
  clientName: string;
  /// Услуги уже на языке клиента (см. pickLocalized в booking-status.ts).
  serviceName: string;
  startsAt: Date;
  /// Язык сайта, на котором клиент оформлял заявку (Booking.locale) —
  /// письмо уходит ТОЛЬКО на этом языке, не двуязычно (было RU+RO в
  /// одном теле — по прямой просьбе пользователя заменено на выбор по
  /// локали).
  locale: Locale;
}

const SHOP_TIMEZONE = "Europe/Chisinau";

function formatDateTime(d: Date, locale: Locale): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SHOP_TIMEZONE,
  };
  return new Intl.DateTimeFormat(intlLocale(locale), opts).format(d);
}

const COPY = {
  ru: {
    subject: { CONFIRMED: "Запись подтверждена — W Condrea Barber", CANCELLED: "Запись отменена — W Condrea Barber" },
    greeting: (name: string) => `Здравствуйте, ${name}!`,
    body: { CONFIRMED: "Ваша запись подтверждена:", CANCELLED: "Ваша запись отменена:" },
  },
  ro: {
    subject: { CONFIRMED: "Programare confirmată — W Condrea Barber", CANCELLED: "Programare anulată — W Condrea Barber" },
    greeting: (name: string) => `Bună, ${name}!`,
    body: { CONFIRMED: "Programarea dvs. a fost confirmată:", CANCELLED: "Programarea dvs. a fost anulată:" },
  },
  en: {
    subject: { CONFIRMED: "Appointment confirmed — W Condrea Barber", CANCELLED: "Appointment cancelled — W Condrea Barber" },
    greeting: (name: string) => `Hello, ${name}!`,
    body: { CONFIRMED: "Your appointment is confirmed:", CANCELLED: "Your appointment has been cancelled:" },
  },
} as const;

export async function sendBookingStatusEmail(
  data: BookingEmailData,
  status: "CONFIRMED" | "CANCELLED",
): Promise<{ sent: boolean; reason?: string }> {
  const t = getTransporter();
  if (!t) {
    console.warn("[mailer] GMAIL_USER/GMAIL_APP_PASSWORD не заданы — письмо не отправлено");
    return { sent: false, reason: "not-configured" };
  }

  const c = COPY[data.locale];
  const dt = formatDateTime(data.startsAt, data.locale);
  const serviceName = data.serviceName;

  // Логотип WK — PNG (SVG почтовые клиенты, в т.ч. Gmail, не показывают),
  // абсолютным URL на сайт. Адрес сайта: SITE_URL, иначе системная
  // переменная Vercel с прод-доменом; если нет ни того ни другого
  // (локальная разработка) — письмо просто без картинки.
  const site = process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null);
  const logo = site
    ? `<img src="${site.replace(/\/$/, "")}/brand/wk-email.png" width="48" height="48" alt="WK" style="display: block; border-radius: 11px; margin-bottom: 10px;" />`
    : "";

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      ${logo}
      <h2 style="color: #d81f26; margin-bottom: 4px;">W Condrea Barber</h2>
      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />

      <p><strong>${c.greeting(escapeHtml(data.clientName))}</strong></p>
      <p>${c.body[status]}</p>
      <p>
        📅 ${dt}<br />
        ✂️ ${escapeHtml(serviceName)}
      </p>
    </div>
  `.trim();

  try {
    await t.sendMail({
      from: `"W Condrea Barber" <${GMAIL_USER}>`,
      to: data.clientEmail,
      subject: c.subject[status],
      html,
    });
    return { sent: true };
  } catch (error) {
    console.error("[mailer] не удалось отправить письмо:", error);
    return { sent: false, reason: "send-failed" };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
