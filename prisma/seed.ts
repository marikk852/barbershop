import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ВРЕМЕННЫЕ ДАННЫЕ. Цены, тексты и фото — плейсхолдеры для разработки,
// пока не пришли настоящие от барбера (задача #4). Фото — свободные с
// Unsplash (Unsplash License), для реального запуска заменить на съёмку
// барбера. Цены в MDL (priceCents хранит бани, 100 = 1 лея).
const services = [
  {
    slug: "haircut",
    nameRu: "Стрижка",
    nameRo: "Tuns",
    durationMin: 45,
    priceCents: 35000,
    order: 0,
  },
  {
    slug: "beard",
    nameRu: "Оформление бороды",
    nameRo: "Aranjare barbă",
    durationMin: 25,
    priceCents: 20000,
    order: 1,
  },
  {
    slug: "haircut-beard",
    nameRu: "Стрижка + борода",
    nameRo: "Tuns + barbă",
    durationMin: 65,
    priceCents: 50000,
    order: 2,
  },
  {
    slug: "royal-shave",
    nameRu: "Королевское бритьё",
    nameRo: "Bărbierit regal",
    durationMin: 40,
    priceCents: 30000,
    order: 3,
  },
  {
    slug: "kids-haircut",
    nameRu: "Детская стрижка",
    nameRo: "Tuns copii",
    durationMin: 30,
    priceCents: 25000,
    order: 4,
  },
];

// weekday: 0=воскресенье..6=суббота (JS Date#getDay). Пн–Сб 9:00–19:00, вс — выходной.
const workingHours = [
  { weekday: 0, startMinute: 0, endMinute: 0, closed: true },
  { weekday: 1, startMinute: 540, endMinute: 1140, closed: false },
  { weekday: 2, startMinute: 540, endMinute: 1140, closed: false },
  { weekday: 3, startMinute: 540, endMinute: 1140, closed: false },
  { weekday: 4, startMinute: 540, endMinute: 1140, closed: false },
  { weekday: 5, startMinute: 540, endMinute: 1140, closed: false },
  { weekday: 6, startMinute: 600, endMinute: 1080, closed: false },
];

const portfolio = [
  { file: "work-1.jpg", captionRu: "Оформление у зеркала", captionRo: "Styling la oglindă" },
  { file: "work-2.jpg", captionRu: "Текстурная укладка", captionRo: "Styling texturat" },
  { file: "work-3.jpg", captionRu: "Чёткие линии окантовки", captionRo: "Contur precis" },
  { file: "work-4.jpg", captionRu: "Fade под машинку", captionRo: "Fade la mașină" },
  { file: "work-5.jpg", captionRu: "Работа с расчёской", captionRo: "Lucru cu pieptenele" },
  { file: "work-6.jpg", captionRu: "Классическая стрижка", captionRo: "Tuns clasic" },
  { file: "work-7.jpg", captionRu: "Точная окантовка машинкой", captionRo: "Contur precis cu mașina" },
  { file: "work-8.jpg", captionRu: "Атмосфера барбершопа", captionRo: "Atmosfera barbershop-ului" },
  { file: "work-9.jpg", captionRu: "Уход после стрижки", captionRo: "Îngrijire după tuns" },
  { file: "work-10.jpg", captionRu: "Укладка перед зеркалом", captionRo: "Coafare la oglindă" },
  { file: "work-11.jpg", captionRu: "Fade с плавным переходом", captionRo: "Fade cu tranziție lină" },
  { file: "work-12.jpg", captionRu: "Детальная окантовка машинкой", captionRo: "Contur detaliat cu mașina" },
];

const bioRu = `Full-cycle барбер: от классической стрижки и оформления бороды до
королевского бритья опасной бритвой. Работаю в Кишинёве, слежу за формой
и деталями — окантовка, переходы, текстура. Каждая стрижка подбирается
под форму лица и то, как волосы ведут себя в жизни, а не только в кресле.`;

const bioRo = `Barber full-cycle: de la tuns clasic și aranjare barbă până la
bărbierit regal cu briciul. Lucrez în Chișinău și acord atenție detaliilor —
contur, tranziții, textură. Fiecare tuns este ales în funcție de forma feței
și de comportamentul părului în viața de zi cu zi, nu doar în scaun.`;

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  await prisma.service.deleteMany();
  for (const s of services) {
    await prisma.service.create({ data: s });
  }
  console.log(`услуги: ${services.length}`);

  for (const wh of workingHours) {
    await prisma.workingHours.upsert({
      where: { weekday: wh.weekday },
      update: wh,
      create: wh,
    });
  }
  console.log(`график: ${workingHours.length} дней`);

  await prisma.portfolioItem.deleteMany();
  for (const [i, p] of portfolio.entries()) {
    await prisma.portfolioItem.create({
      data: {
        imageUrl: `/portfolio/${p.file}`,
        captionRu: p.captionRu,
        captionRo: p.captionRo,
        order: i,
      },
    });
  }
  console.log(`портфолио: ${portfolio.length} фото`);

  await prisma.siteContent.upsert({
    where: { id: 1 },
    update: { bioRu, bioRo, address: "Chișinău" },
    create: { id: 1, bioRu, bioRo, address: "Chișinău" },
  });
  console.log("контент сайта: био записано");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
