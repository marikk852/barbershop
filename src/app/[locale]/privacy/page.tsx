import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

// Политика конфиденциальности (GDPR) — на неё ссылается обязательный
// чекбокс согласия в форме записи (booking-flow.tsx). Текст описывает
// ровно то, что сайт делает на самом деле (см. /api/booking, lib/mailer.ts,
// lib/telegram-bot.ts, lib/booking-guard.ts) — при изменении того, какие
// данные собираются или кому передаются, этот текст нужно обновить.
// Контакты оператора берутся из SiteContent (редактируются в /admin/content).

const OPERATOR = "W Condrea Barber";
const UPDATED = "07.11.2026";

type Section = { h: string; p?: string[]; list?: string[] };

const TEXT: Record<Locale, { title: string; updated: string; intro: string; contacts: string; sections: Section[] }> = {
  ru: {
    title: "Политика конфиденциальности",
    updated: `Редакция от ${UPDATED}`,
    intro: `Здесь описано, какие персональные данные собирает сайт барбера ${OPERATOR} при онлайн-записи, зачем, кому они передаются и какие у вас есть права. Мы обрабатываем данные в соответствии с Общим регламентом ЕС по защите данных (GDPR, Регламент 2016/679) и законодательством Республики Молдова о защите персональных данных.`,
    contacts: "Контакты оператора данных",
    sections: [
      {
        h: "1. Кто обрабатывает ваши данные",
        p: [`Оператор персональных данных — барбер ${OPERATOR}. По любым вопросам о ваших данных пишите или звоните по контактам ниже.`],
      },
      {
        h: "2. Какие данные мы собираем",
        list: [
          "имя и номер телефона — обязательно, чтобы записать вас и связаться для подтверждения;",
          "email — по желанию, чтобы прислать подтверждение или отмену записи;",
          "комментарий к записи — по желанию;",
          "выбранные услуги, дата и время визита, язык сайта;",
          "идентификатор чата в Telegram — только если вы сами подключите уведомления через нашего бота.",
        ],
        p: [
          "Для защиты от спама сайт кратковременно учитывает IP-адрес, с которого отправлена заявка. IP-адрес не сохраняется в базе данных и не связывается с вашей записью.",
          "Сайт не использует рекламные и аналитические cookie. Сохраняется только технический cookie с выбранным языком сайта.",
        ],
      },
      {
        h: "3. Зачем мы их обрабатываем",
        list: [
          "чтобы записать вас на услугу и вести расписание барбера;",
          "чтобы подтвердить, перенести или отменить визит и сообщить вам об этом;",
          "для внутреннего учёта визитов (количество записей, популярность услуг) — без передачи третьим лицам.",
        ],
        p: ["Мы не используем ваши данные для рекламных рассылок и не продаём их."],
      },
      {
        h: "4. Правовое основание",
        p: [
          "Ваше согласие, которое вы даёте, отмечая чекбокс в форме записи (ст. 6(1)(a) GDPR), а также необходимость выполнить вашу просьбу о записи на услугу (ст. 6(1)(b) GDPR).",
        ],
      },
      {
        h: "5. Кому передаются данные",
        p: ["Данные видит только барбер и уполномоченные им администраторы записи. Для работы сайта мы пользуемся услугами технических подрядчиков, которые хранят или передают данные по нашему поручению:"],
        list: [
          "Vercel Inc. — хостинг сайта;",
          "Prisma Data — база данных (серверы в ЕС, Франкфурт);",
          "Google (Gmail) — отправка писем о статусе записи, если вы указали email;",
          "Telegram — уведомления барберу о новой заявке и вам о статусе записи, если вы подключили бота.",
        ],
      },
      {
        h: "6. Передача за пределы Молдовы и ЕС",
        p: [
          "Некоторые подрядчики (Vercel, Google, Telegram) могут обрабатывать данные за пределами Республики Молдова и ЕС. Такая передача происходит на условиях, которые эти компании предоставляют для защиты данных (в том числе стандартные договорные положения ЕС).",
        ],
      },
      {
        h: "7. Сколько мы храним данные",
        p: [
          "Данные о записи хранятся, пока они нужны для визита и внутреннего учёта визитов. Вы можете в любой момент попросить удалить ваши данные: мы удалим запись и связанные с ней контакты.",
        ],
      },
      {
        h: "8. Ваши права",
        list: [
          "узнать, какие ваши данные у нас есть, и получить их копию;",
          "исправить неточные данные;",
          "потребовать удаления данных;",
          "ограничить обработку или возразить против неё;",
          "отозвать согласие в любой момент — это не влияет на законность обработки до отзыва;",
          "подать жалобу в Национальный центр по защите персональных данных Республики Молдова (НЦЗПД).",
        ],
        p: ["Чтобы воспользоваться правами, свяжитесь с нами по контактам ниже. Мы ответим в течение 30 дней."],
      },
      {
        h: "9. Безопасность",
        p: [
          "Сайт работает только по защищённому соединению (HTTPS). Доступ к заявкам есть только у барбера и выданных им администраторов, вход — через проверенный аккаунт Telegram.",
        ],
      },
      {
        h: "10. Изменения политики",
        p: ["Мы можем обновлять эту политику. Актуальная редакция всегда опубликована на этой странице, дата редакции указана вверху."],
      },
    ],
  },
  ro: {
    title: "Politica de confidențialitate",
    updated: `Versiunea din ${UPDATED}`,
    intro: `Aici explicăm ce date cu caracter personal colectează site-ul frizerului ${OPERATOR} la programarea online, de ce, cui le transmitem și ce drepturi aveți. Prelucrăm datele în conformitate cu Regulamentul general privind protecția datelor (GDPR, Regulamentul UE 2016/679) și cu legislația Republicii Moldova privind protecția datelor cu caracter personal.`,
    contacts: "Datele de contact ale operatorului",
    sections: [
      {
        h: "1. Cine prelucrează datele dvs.",
        p: [`Operatorul datelor cu caracter personal este frizerul ${OPERATOR}. Pentru orice întrebare despre datele dvs., scrieți-ne sau sunați-ne la datele de contact de mai jos.`],
      },
      {
        h: "2. Ce date colectăm",
        list: [
          "numele și numărul de telefon — obligatoriu, pentru a vă programa și a vă contacta pentru confirmare;",
          "adresa de email — opțional, pentru a vă trimite confirmarea sau anularea programării;",
          "comentariul la programare — opțional;",
          "serviciile alese, data și ora vizitei, limba site-ului;",
          "identificatorul chat-ului Telegram — doar dacă activați singur notificările prin botul nostru.",
        ],
        p: [
          "Pentru protecția împotriva spamului, site-ul ia în calcul temporar adresa IP de pe care a fost trimisă cererea. Adresa IP nu se salvează în baza de date și nu este legată de programarea dvs.",
          "Site-ul nu folosește cookie-uri de publicitate sau de analiză. Se salvează doar un cookie tehnic cu limba aleasă a site-ului.",
        ],
      },
      {
        h: "3. De ce le prelucrăm",
        list: [
          "pentru a vă programa la serviciu și a gestiona programul frizerului;",
          "pentru a confirma, reprograma sau anula vizita și a vă anunța despre aceasta;",
          "pentru evidența internă a vizitelor (numărul de programări, popularitatea serviciilor) — fără a le transmite terților.",
        ],
        p: ["Nu folosim datele dvs. pentru mesaje publicitare și nu le vindem."],
      },
      {
        h: "4. Temeiul juridic",
        p: [
          "Consimțământul dvs., pe care îl exprimați bifând căsuța din formularul de programare (art. 6 alin. (1) lit. (a) GDPR), precum și necesitatea de a da curs cererii dvs. de programare (art. 6 alin. (1) lit. (b) GDPR).",
        ],
      },
      {
        h: "5. Cui transmitem datele",
        p: ["Datele le vede doar frizerul și administratorii programărilor autorizați de acesta. Pentru funcționarea site-ului folosim servicii ale unor furnizori tehnici, care stochează sau transmit datele în numele nostru:"],
        list: [
          "Vercel Inc. — găzduirea site-ului;",
          "Prisma Data — baza de date (servere în UE, Frankfurt);",
          "Google (Gmail) — trimiterea emailurilor despre starea programării, dacă ați indicat un email;",
          "Telegram — notificări către frizer despre o cerere nouă și către dvs. despre starea programării, dacă ați activat botul.",
        ],
      },
      {
        h: "6. Transferul în afara Moldovei și a UE",
        p: [
          "Unii furnizori (Vercel, Google, Telegram) pot prelucra datele în afara Republicii Moldova și a UE. Un astfel de transfer are loc în condițiile oferite de aceste companii pentru protecția datelor (inclusiv clauzele contractuale standard ale UE).",
        ],
      },
      {
        h: "7. Cât timp păstrăm datele",
        p: [
          "Datele programării se păstrează cât timp sunt necesare pentru vizită și pentru evidența internă a vizitelor. Puteți cere oricând ștergerea datelor dvs.: vom șterge programarea și datele de contact legate de ea.",
        ],
      },
      {
        h: "8. Drepturile dvs.",
        list: [
          "să aflați ce date ale dvs. deținem și să primiți o copie a acestora;",
          "să rectificați datele inexacte;",
          "să cereți ștergerea datelor;",
          "să restricționați prelucrarea sau să vă opuneți acesteia;",
          "să vă retrageți oricând consimțământul — aceasta nu afectează legalitatea prelucrării de până la retragere;",
          "să depuneți o plângere la Centrul Național pentru Protecția Datelor cu Caracter Personal al Republicii Moldova (CNPDCP).",
        ],
        p: ["Pentru a vă exercita drepturile, contactați-ne la datele de mai jos. Vă răspundem în termen de 30 de zile."],
      },
      {
        h: "9. Securitate",
        p: [
          "Site-ul funcționează doar prin conexiune securizată (HTTPS). Acces la cereri au doar frizerul și administratorii desemnați de acesta, autentificarea se face printr-un cont Telegram verificat.",
        ],
      },
      {
        h: "10. Modificarea politicii",
        p: ["Putem actualiza această politică. Versiunea actuală este întotdeauna publicată pe această pagină, data versiunii este indicată mai sus."],
      },
    ],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return { title: `${TEXT[locale].title} — ${OPERATOR}` };
}

export default async function PrivacyPage() {
  const locale = (await getLocale()) as Locale;
  const t = TEXT[locale];
  const content = await prisma.siteContent.findUnique({ where: { id: 1 } });
  const tg = content?.telegramUsername?.replace(/^@/, "");

  return (
    // Сцена на этой странице не монтируется (см. components/scene-gate.tsx),
    // поэтому отступ сверху обычный, без var(--scene-h).
    <main className="mx-auto max-w-2xl px-6 pt-16 pb-16 text-[17px] [font-family:var(--font-pt-sans-narrow),sans-serif]">
      <Link href="/" className="text-sm uppercase tracking-[0.14em] text-zinc-500 hover:text-zinc-300">
        ← {OPERATOR}
      </Link>
      <h1 className="mt-6 font-serif text-3xl tracking-wide">{t.title}</h1>
      <p className="mt-2 text-sm text-zinc-500">{t.updated}</p>
      <p className="mt-8 leading-relaxed text-zinc-200">{t.intro}</p>

      {t.sections.map((s) => (
        <section key={s.h} className="mt-10">
          <h2 className="font-serif text-xl tracking-wide">{s.h}</h2>
          {s.list && (
            <ul className="mt-4 list-disc space-y-1.5 pl-5 leading-relaxed text-zinc-300">
              {s.list.map((li) => (
                <li key={li}>{li}</li>
              ))}
            </ul>
          )}
          {s.p?.map((para) => (
            <p key={para} className="mt-4 leading-relaxed text-zinc-300">
              {para}
            </p>
          ))}
        </section>
      ))}

      <section className="mt-10 rounded-xl border border-white/10 p-5">
        <h2 className="font-serif text-xl tracking-wide">{t.contacts}</h2>
        <ul className="mt-3 space-y-1 text-zinc-300">
          <li>{OPERATOR}</li>
          {content?.address && <li>{content.address}</li>}
          {content?.phone && (
            <li>
              <a className="underline underline-offset-4" href={`tel:${content.phone.replace(/[^\d+]/g, "")}`}>
                {content.phone}
              </a>
            </li>
          )}
          {tg && (
            <li>
              <a className="underline underline-offset-4" href={`https://t.me/${tg}`} target="_blank" rel="noopener noreferrer">
                Telegram @{tg}
              </a>
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
