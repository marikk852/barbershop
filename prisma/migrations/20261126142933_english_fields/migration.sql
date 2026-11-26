-- AlterTable
ALTER TABLE "PortfolioItem" ADD COLUMN     "captionEn" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "nameEn" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "SiteContent" ADD COLUMN     "bioEn" TEXT NOT NULL DEFAULT '';

-- Английский перевод уже существующего контента (на момент добавления
-- английской версии сайта). Сопоставление по русскому тексту, а не по id —
-- одинаково работает и на проде, и на локальной базе; записи, которых нет,
-- просто не затрагиваются. Дальше английские поля правятся в админке.
UPDATE "Service" SET "nameEn" = v.en
FROM (VALUES
  ('Оформление бороды', 'Beard trim & shaping'),
  ('Стрижка', 'Haircut'),
  ('Стрижка + борода', 'Haircut + beard'),
  ('Детская стрижка', 'Kids'' haircut'),
  ('Королевское бритьё', 'Royal shave'),
  ('Чистка + спа для лица', 'Facial cleansing + spa'),
  ('Тонирование волос', 'Hair toning'),
  ('Тонирование бороды', 'Beard toning'),
  ('Депиляция лица воском', 'Facial waxing')
) AS v(ru, en)
WHERE "Service"."nameRu" = v.ru AND "Service"."nameEn" = '';

UPDATE "PortfolioItem" SET "captionEn" = v.en
FROM (VALUES
  ('Классическая стрижка ножницами и борода', 'Classic scissor cut and beard'),
  ('Квиф и средний Фейд', 'Quiff and mid fade'),
  ('Soft taper fade', 'Soft taper fade'),
  ('Soft taper fade and beard', 'Soft taper fade and beard')
) AS v(ru, en)
WHERE "PortfolioItem"."captionRu" = v.ru AND "PortfolioItem"."captionEn" IS NULL;

UPDATE "SiteContent" SET "bioEn" = E'Valeria | Grand Barber ✂️\nFor me, barbering is more than just a haircut. It''s about style, confidence and a good mood.\nFor 6 years I''ve been creating men''s looks: haircuts and beards of any length and complexity — from timeless classics to the latest trends.\nI also do hair colouring, total blonde, facial cleansing, waxing and massage.\nAnd most importantly — here you can relax, chat, laugh and simply have a good time.\nYour look. Your mood. My craft. 🤍'
WHERE "bioEn" = '' AND "bioRu" LIKE 'Валерия | Grand Barber%';
