import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// Ленивая инициализация + переиспользование одного транспорта на все
// запросы serverless-функции (пока она "тёплая") — createTransport на
// каждое письмо не нужен, объект лёгкий и просто хранит конфигурацию
// SMTP-соединения.
let transporter: nodemailer.Transporter | null | undefined;

function getTransporter(): nodemailer.Transporter | null {
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
  serviceNameRu: string;
  serviceNameRo: string;
  startsAt: Date;
}

const SHOP_TIMEZONE = "Europe/Chisinau";

function formatDateTime(d: Date): { ru: string; ro: string } {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SHOP_TIMEZONE,
  };
  return {
    ru: new Intl.DateTimeFormat("ru-RU", opts).format(d),
    ro: new Intl.DateTimeFormat("ro-RO", opts).format(d),
  };
}

// Письмо специально двуязычное (RU+RO в одном теле), а не по локали
// клиента: локаль, в которой человек открывал сайт, нигде не
// сохраняется вместе с записью (Booking её не хранит) — надёжнее
// показать оба варианта сразу, чем гадать или заводить под это
// отдельное поле в схеме ради одной email-рассылки.
export async function sendBookingStatusEmail(
  data: BookingEmailData,
  status: "CONFIRMED" | "CANCELLED",
): Promise<{ sent: boolean; reason?: string }> {
  const t = getTransporter();
  if (!t) {
    console.warn("[mailer] GMAIL_USER/GMAIL_APP_PASSWORD не заданы — письмо не отправлено");
    return { sent: false, reason: "not-configured" };
  }

  const dt = formatDateTime(data.startsAt);
  const isConfirmed = status === "CONFIRMED";

  const subject = isConfirmed
    ? "Запись подтверждена / Programare confirmată — W Condrea Barber"
    : "Запись отменена / Programare anulată — W Condrea Barber";

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #d81f26; margin-bottom: 4px;">W Condrea Barber</h2>
      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />

      <p><strong>Здравствуйте, ${escapeHtml(data.clientName)}!</strong></p>
      <p>${isConfirmed ? "Ваша запись подтверждена:" : "Ваша запись отменена:"}</p>
      <p>
        📅 ${dt.ru}<br />
        ✂️ ${escapeHtml(data.serviceNameRu)}
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />

      <p><strong>Bună, ${escapeHtml(data.clientName)}!</strong></p>
      <p>${isConfirmed ? "Programarea dvs. a fost confirmată:" : "Programarea dvs. a fost anulată:"}</p>
      <p>
        📅 ${dt.ro}<br />
        ✂️ ${escapeHtml(data.serviceNameRo)}
      </p>
    </div>
  `.trim();

  try {
    await t.sendMail({
      from: `"W Condrea Barber" <${GMAIL_USER}>`,
      to: data.clientEmail,
      subject,
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
