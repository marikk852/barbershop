import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

// Политика конфиденциальности (GDPR + Закон РМ № 195/2024) — на неё
// ссылается обязательный чекбокс в форме записи (booking-flow.tsx).
// Структура ориентирована на клиентскую политику stilio.md (молдавская
// платформа записи), текст написан заново под то, что ЭТОТ сайт делает
// на самом деле (см. /api/booking, lib/mailer.ts, lib/telegram-bot.ts,
// lib/booking-guard.ts). Если меняется, какие данные собираются или кому
// передаются, — этот текст нужно обновить вместе с кодом.
// Контакты оператора берутся из SiteContent (редактируются в /admin/content).
//
// TODO(владелец): OPERATOR — пока торговое имя. Для полной политики нужно
// юридическое имя (ИП/компания + IDNO и адрес, либо ФИО физлица).

const OPERATOR = "W Condrea Barber";
const UPDATED = "07.11.2026";

type Row = { data: string; purpose: string; basis: string; retention: string };
type Section = { h: string; p?: string[]; list?: string[]; table?: Row[] };
type Copy = {
  title: string;
  updated: string;
  intro: string;
  contacts: string;
  cols: { purpose: string; basis: string; retention: string };
  sections: Section[];
};

const TEXT: Record<Locale, Copy> = {
  ru: {
    title: "Политика конфиденциальности",
    updated: `Редакция от ${UPDATED}`,
    intro: `Эта политика объясняет, какие персональные данные собирает сайт барбера ${OPERATOR}, когда вы записываетесь онлайн, для чего они нужны, кто их видит, сколько они хранятся и как вы можете ими управлять. Мы обрабатываем данные по Закону Республики Молдова № 195/2024 о защите персональных данных и, для посетителей из ЕС, по Общему регламенту по защите данных (GDPR, Регламент ЕС 2016/679).`,
    contacts: "Контакты оператора данных",
    cols: { purpose: "Зачем", basis: "Основание", retention: "Срок хранения" },
    sections: [
      {
        h: "1. Кто отвечает за ваши данные",
        p: [
          `Оператор персональных данных — барбер ${OPERATOR}. Он решает, зачем и как обрабатываются данные клиентов, и отвечает за это. Вопросы о ваших данных и запросы по вашим правам направляйте по контактам в конце страницы.`,
          "Мы придерживаемся основных принципов защиты данных: собираем только то, что нужно для записи, используем данные только для этого, храним их не дольше необходимого и защищаем от посторонних.",
        ],
      },
      {
        h: "2. Откуда мы получаем данные",
        list: [
          "от вас — когда вы заполняете форму записи на сайте или сами подключаете уведомления в Telegram;",
          "от барбера — если вы записались по телефону или лично, и барбер внёс визит в расписание вручную;",
          "автоматически — технические данные, без которых сайт не работает (например, IP-адрес при отправке заявки).",
        ],
      },
      {
        h: "3. Какие данные, зачем и сколько храним",
        table: [
          {
            data: "Имя и номер телефона",
            purpose: "Записать вас, связаться для подтверждения или переноса визита",
            basis: "Подготовка и оказание услуги по вашей просьбе — ст. 6(1)(b) GDPR",
            retention: "Пока запись актуальна и нужна для учёта визитов; удаляем раньше по вашему запросу",
          },
          {
            data: "Email (по желанию)",
            purpose: "Прислать письмо о подтверждении или отмене записи",
            basis: "Оказание услуги — ст. 6(1)(b) GDPR",
            retention: "Вместе с записью",
          },
          {
            data: "Услуги, дата и время визита, комментарий, язык сайта",
            purpose: "Вести расписание барбера, подготовиться к визиту, писать вам на вашем языке",
            basis: "Оказание услуги — ст. 6(1)(b) GDPR",
            retention: "Вместе с записью",
          },
          {
            data: "Идентификатор чата в Telegram",
            purpose: "Присылать статус записи в Telegram",
            basis: "Ваше согласие — вы сами запускаете нашего бота, ст. 6(1)(a) GDPR",
            retention: "Вместе с записью; можно отказаться в любой момент, остановив бота",
          },
          {
            data: "IP-адрес при отправке заявки",
            purpose: "Защита формы от спама и злоупотреблений",
            basis: "Законный интерес — безопасность сайта, ст. 6(1)(f) GDPR",
            retention: "Не записывается в базу данных; учитываются только заявки за последние 10 минут",
          },
          {
            data: "Статистика визитов",
            purpose: "Понимать загрузку, популярность услуг и узнавать постоянных клиентов (число визитов и их сумма по номеру телефона) — видит только барбер",
            basis: "Законный интерес — ведение работы барбера, ст. 6(1)(f) GDPR; вы можете возразить",
            retention: "Считается на лету из существующих записей, отдельно не хранится; удаление записи убирает её и из статистики",
          },
        ],
        p: [
          "Отмечая чекбокс в форме записи, вы подтверждаете, что прочитали эту политику и согласны на обработку данных для записи. Без имени и телефона записаться онлайн нельзя: иначе барбер не сможет с вами связаться.",
        ],
      },
      {
        h: "4. Маркетинг и автоматические решения",
        p: [
          "Мы не отправляем рекламные рассылки и не передаём ваши данные для рекламы. Сообщения о вашей записи — служебные, а не маркетинговые.",
          "Мы не строим маркетинговых профилей клиентов и не принимаем о вас решений полностью автоматически. Запрос на запись всегда подтверждает или отклоняет сам барбер.",
        ],
      },
      {
        h: "5. Данные о здоровье",
        p: [
          "Если в комментарии к записи вы сообщаете, например, об аллергии или чувствительной коже, это особая категория данных. Мы используем такие сведения только чтобы безопасно оказать услугу, и только потому, что вы сами их указали (явное согласие, ст. 9(2)(a) GDPR). Не пишите в комментарий ничего лишнего: всё важное можно обсудить с барбером лично.",
        ],
      },
      {
        h: "6. Cookie",
        p: [
          "Сайт не использует рекламные и аналитические cookie и сторонние трекеры. Сохраняется только технический cookie с выбранным языком сайта: он нужен, чтобы сайт открывался на вашем языке, и не требует согласия.",
        ],
      },
      {
        h: "7. Кто видит ваши данные",
        p: [
          "Ваши данные видит барбер и, если он их назначил, администраторы записи. Для работы сайта мы пользуемся услугами технических подрядчиков, которые обрабатывают данные только по нашему поручению:",
        ],
        list: [
          "Vercel Inc. — хостинг сайта; хостинг может вести технические журналы запросов по своим правилам;",
          "Prisma Data — база данных, серверы в ЕС (Франкфурт);",
          "Google (Gmail) — отправка писем о записи, если вы указали email;",
          "Telegram — уведомление барберу о новой заявке и вам о статусе записи, если вы подключили бота.",
        ],
      },
      {
        h: "8. Передача данных за рубеж",
        p: [
          "База данных находится в ЕС. Часть подрядчиков (Vercel, Google, Telegram) может обрабатывать данные и за пределами Республики Молдова и ЕС. В таких случаях передача идёт на условиях, которые эти компании предоставляют для защиты данных: стандартные договорные положения ЕС и, где применимо, EU-U.S. Data Privacy Framework.",
        ],
      },
      {
        h: "9. Сколько мы храним данные",
        p: [
          "Данные записи хранятся, пока они нужны для визита и для учёта визитов барбера. Если вы попросите удалить ваши данные, мы удалим запись вместе с контактами без неоправданной задержки. Отменённые и тестовые записи барбер удаляет из системы.",
        ],
      },
      {
        h: "10. Безопасность",
        list: [
          "сайт работает только по защищённому соединению (HTTPS/TLS);",
          "доступ к заявкам есть только у барбера и назначенных им администраторов, вход — через подтверждённый аккаунт Telegram;",
          "база данных размещена в ЕС у специализированного провайдера;",
          "форма записи защищена от автоматических заявок и спама.",
        ],
      },
      {
        h: "11. Ваши права",
        list: [
          "узнать, какие данные о вас у нас есть, и получить их копию;",
          "исправить неточные или неполные данные;",
          "потребовать удалить данные;",
          "ограничить обработку;",
          "получить свои данные в удобном машиночитаемом формате (переносимость);",
          "возразить против обработки на основании законного интереса;",
          "в любой момент отозвать согласие — это не отменяет законность обработки до отзыва;",
          "подать жалобу в надзорный орган (см. раздел 12).",
        ],
        p: [
          "Чтобы воспользоваться правами, свяжитесь с нами по контактам ниже. Мы ответим в течение одного месяца; если запрос сложный, срок может быть продлён ещё на два месяца — мы предупредим об этом. Чтобы не передать ваши данные постороннему, мы можем попросить подтвердить, что запрос отправили именно вы. Обычно это бесплатно.",
        ],
      },
      {
        h: "12. Надзорный орган",
        p: [
          "Если вы считаете, что ваши данные обрабатываются с нарушением, вы можете подать жалобу в Национальный центр по защите персональных данных Республики Молдова (НЦЗПД). Это не лишает вас права на другие способы защиты.",
        ],
      },
      {
        h: "13. Дети",
        p: [
          "Онлайн-запись рассчитана на взрослых. Если вы записываете ребёнка (например, на детскую стрижку), заявку оформляет родитель или законный представитель и указывает свои контактные данные. Данные самого ребёнка нам не нужны.",
        ],
      },
      {
        h: "14. Ответственный за защиту данных",
        p: [
          "Отдельного ответственного по защите данных (DPO) закон в нашем случае назначать не требует. По всем вопросам о данных обращайтесь напрямую к оператору по контактам ниже.",
        ],
      },
      {
        h: "15. Изменения",
        p: [
          "Мы можем обновлять эту политику, например если на сайте появятся новые функции. Актуальная редакция всегда опубликована на этой странице, дата указана вверху.",
        ],
      },
    ],
  },
  ro: {
    title: "Politica de confidențialitate",
    updated: `Versiunea din ${UPDATED}`,
    intro: `Această politică explică ce date cu caracter personal colectează site-ul frizerului ${OPERATOR} atunci când vă programați online, la ce folosesc, cine le vede, cât timp sunt păstrate și cum le puteți controla. Prelucrăm datele conform Legii Republicii Moldova nr. 195/2024 privind protecția datelor cu caracter personal și, pentru vizitatorii din UE, conform Regulamentului general privind protecția datelor (GDPR, Regulamentul UE 2016/679).`,
    contacts: "Datele de contact ale operatorului",
    cols: { purpose: "Pentru ce", basis: "Temei", retention: "Termen de păstrare" },
    sections: [
      {
        h: "1. Cine răspunde de datele dvs.",
        p: [
          `Operatorul datelor cu caracter personal este frizerul ${OPERATOR}. El decide de ce și cum sunt prelucrate datele clienților și răspunde pentru aceasta. Întrebările despre datele dvs. și cererile privind drepturile dvs. le puteți trimite la datele de contact de la finalul paginii.`,
          "Respectăm principiile de bază ale protecției datelor: colectăm doar ce este necesar pentru programare, folosim datele doar în acest scop, nu le păstrăm mai mult decât trebuie și le protejăm de accesul persoanelor străine.",
        ],
      },
      {
        h: "2. De unde obținem datele",
        list: [
          "de la dvs. — când completați formularul de programare de pe site sau activați singur notificările în Telegram;",
          "de la frizer — dacă v-ați programat telefonic sau personal, iar frizerul a introdus vizita manual în program;",
          "automat — date tehnice fără de care site-ul nu funcționează (de exemplu, adresa IP la trimiterea cererii).",
        ],
      },
      {
        h: "3. Ce date, pentru ce și cât le păstrăm",
        table: [
          {
            data: "Numele și numărul de telefon",
            purpose: "Să vă programăm și să vă contactăm pentru confirmarea sau reprogramarea vizitei",
            basis: "Pregătirea și prestarea serviciului la cererea dvs. — art. 6 alin. (1) lit. (b) GDPR",
            retention: "Cât timp programarea este actuală și necesară pentru evidența vizitelor; ștergem mai devreme la cererea dvs.",
          },
          {
            data: "Email (opțional)",
            purpose: "Să vă trimitem un email despre confirmarea sau anularea programării",
            basis: "Prestarea serviciului — art. 6 alin. (1) lit. (b) GDPR",
            retention: "Împreună cu programarea",
          },
          {
            data: "Serviciile, data și ora vizitei, comentariul, limba site-ului",
            purpose: "Gestionarea programului frizerului, pregătirea vizitei, comunicarea în limba dvs.",
            basis: "Prestarea serviciului — art. 6 alin. (1) lit. (b) GDPR",
            retention: "Împreună cu programarea",
          },
          {
            data: "Identificatorul chat-ului Telegram",
            purpose: "Să vă trimitem starea programării în Telegram",
            basis: "Consimțământul dvs. — porniți singur botul nostru, art. 6 alin. (1) lit. (a) GDPR",
            retention: "Împreună cu programarea; puteți renunța oricând oprind botul",
          },
          {
            data: "Adresa IP la trimiterea cererii",
            purpose: "Protejarea formularului împotriva spamului și abuzurilor",
            basis: "Interes legitim — securitatea site-ului, art. 6 alin. (1) lit. (f) GDPR",
            retention: "Nu se înregistrează în baza de date; se iau în calcul doar cererile din ultimele 10 minute",
          },
          {
            data: "Statistica vizitelor",
            purpose: "Înțelegerea gradului de ocupare, a popularității serviciilor și recunoașterea clienților fideli (numărul vizitelor și suma lor după numărul de telefon) — o vede doar frizerul",
            basis: "Interes legitim — organizarea activității frizerului, art. 6 alin. (1) lit. (f) GDPR; vă puteți opune",
            retention: "Se calculează din programările existente, nu se păstrează separat; ștergerea programării o elimină și din statistică",
          },
        ],
        p: [
          "Bifând căsuța din formularul de programare, confirmați că ați citit această politică și sunteți de acord cu prelucrarea datelor pentru programare. Fără nume și telefon nu vă puteți programa online: altfel frizerul nu vă poate contacta.",
        ],
      },
      {
        h: "4. Marketing și decizii automate",
        p: [
          "Nu trimitem mesaje publicitare și nu transmitem datele dvs. în scop de publicitate. Mesajele despre programarea dvs. sunt mesaje de serviciu, nu de marketing.",
          "Nu creăm profiluri de marketing ale clienților și nu luăm decizii despre dvs. în mod complet automat. Cererea de programare este confirmată sau respinsă întotdeauna de frizer.",
        ],
      },
      {
        h: "5. Date privind sănătatea",
        p: [
          "Dacă în comentariul la programare menționați, de exemplu, o alergie sau o piele sensibilă, aceasta este o categorie specială de date. Folosim astfel de informații doar pentru a presta serviciul în siguranță și doar pentru că le-ați indicat dvs. (consimțământ explicit, art. 9 alin. (2) lit. (a) GDPR). Nu scrieți în comentariu nimic în plus: tot ce este important puteți discuta personal cu frizerul.",
        ],
      },
      {
        h: "6. Cookie-uri",
        p: [
          "Site-ul nu folosește cookie-uri de publicitate sau de analiză și nici instrumente de urmărire ale terților. Se salvează doar un cookie tehnic cu limba aleasă a site-ului: este necesar ca site-ul să se deschidă în limba dvs. și nu necesită consimțământ.",
        ],
      },
      {
        h: "7. Cine vede datele dvs.",
        p: [
          "Datele dvs. le vede frizerul și, dacă i-a desemnat, administratorii programărilor. Pentru funcționarea site-ului folosim servicii ale unor furnizori tehnici, care prelucrează datele doar la indicația noastră:",
        ],
        list: [
          "Vercel Inc. — găzduirea site-ului; furnizorul poate ține jurnale tehnice ale cererilor conform propriilor reguli;",
          "Prisma Data — baza de date, servere în UE (Frankfurt);",
          "Google (Gmail) — trimiterea emailurilor despre programare, dacă ați indicat un email;",
          "Telegram — notificarea frizerului despre o cerere nouă și a dvs. despre starea programării, dacă ați activat botul.",
        ],
      },
      {
        h: "8. Transferul datelor în străinătate",
        p: [
          "Baza de date se află în UE. O parte dintre furnizori (Vercel, Google, Telegram) pot prelucra datele și în afara Republicii Moldova și a UE. În aceste cazuri, transferul are loc în condițiile oferite de aceste companii pentru protecția datelor: clauzele contractuale standard ale UE și, unde este cazul, EU-U.S. Data Privacy Framework.",
        ],
      },
      {
        h: "9. Cât timp păstrăm datele",
        p: [
          "Datele programării se păstrează cât timp sunt necesare pentru vizită și pentru evidența vizitelor frizerului. Dacă ne cereți să vă ștergem datele, vom șterge programarea împreună cu datele de contact fără întârzieri nejustificate. Programările anulate și cele de test sunt șterse de frizer din sistem.",
        ],
      },
      {
        h: "10. Securitate",
        list: [
          "site-ul funcționează doar prin conexiune securizată (HTTPS/TLS);",
          "acces la cereri au doar frizerul și administratorii desemnați de el, autentificarea se face printr-un cont Telegram verificat;",
          "baza de date este găzduită în UE la un furnizor specializat;",
          "formularul de programare este protejat împotriva cererilor automate și a spamului.",
        ],
      },
      {
        h: "11. Drepturile dvs.",
        list: [
          "să aflați ce date despre dvs. deținem și să primiți o copie a acestora;",
          "să rectificați datele inexacte sau incomplete;",
          "să cereți ștergerea datelor;",
          "să restricționați prelucrarea;",
          "să primiți datele dvs. într-un format structurat, care poate fi citit automat (portabilitate);",
          "să vă opuneți prelucrării bazate pe interes legitim;",
          "să vă retrageți oricând consimțământul — aceasta nu afectează legalitatea prelucrării de până la retragere;",
          "să depuneți o plângere la autoritatea de supraveghere (vezi secțiunea 12).",
        ],
        p: [
          "Pentru a vă exercita drepturile, contactați-ne la datele de mai jos. Vă răspundem în termen de o lună; pentru cererile complexe termenul poate fi prelungit cu încă două luni — vă vom anunța despre aceasta. Pentru a nu transmite datele dvs. unei persoane străine, vă putem ruga să confirmați că cererea a fost trimisă chiar de dvs. De regulă, acest lucru este gratuit.",
        ],
      },
      {
        h: "12. Autoritatea de supraveghere",
        p: [
          "Dacă considerați că datele dvs. sunt prelucrate cu încălcarea legii, puteți depune o plângere la Centrul Național pentru Protecția Datelor cu Caracter Personal al Republicii Moldova (CNPDCP). Aceasta nu vă privează de alte căi de apărare.",
        ],
      },
      {
        h: "13. Copii",
        p: [
          "Programarea online este destinată adulților. Dacă programați un copil (de exemplu, la o tunsoare pentru copii), cererea o face părintele sau reprezentantul legal, indicând propriile date de contact. Datele copilului nu ne sunt necesare.",
        ],
      },
      {
        h: "14. Responsabilul cu protecția datelor",
        p: [
          "În cazul nostru, legea nu impune desemnarea unui responsabil cu protecția datelor (DPO). Pentru orice întrebare despre date, adresați-vă direct operatorului la datele de contact de mai jos.",
        ],
      },
      {
        h: "15. Modificări",
        p: [
          "Putem actualiza această politică, de exemplu dacă pe site apar funcții noi. Versiunea actuală este întotdeauna publicată pe această pagină, data este indicată mai sus.",
        ],
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
          {s.table && (
            // Карточки, а не <table>: на телефоне 4 колонки не помещаются.
            <div className="mt-4 space-y-3">
              {s.table.map((row) => (
                <div key={row.data} className="rounded-xl border border-white/10 p-4">
                  <p className="font-semibold text-zinc-100">{row.data}</p>
                  <dl className="mt-2 space-y-1.5 text-[15px] leading-snug">
                    <div>
                      <dt className="inline text-zinc-500">{t.cols.purpose}: </dt>
                      <dd className="inline text-zinc-300">{row.purpose}</dd>
                    </div>
                    <div>
                      <dt className="inline text-zinc-500">{t.cols.basis}: </dt>
                      <dd className="inline text-zinc-300">{row.basis}</dd>
                    </div>
                    <div>
                      <dt className="inline text-zinc-500">{t.cols.retention}: </dt>
                      <dd className="inline text-zinc-300">{row.retention}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          )}
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
