-- Booking -> Service было один-ко-многим (Booking.serviceId), становится
-- многие-ко-многим через BookingService (несколько услуг в одной записи,
-- каждая со снимком durationMin/priceCents на момент бронирования).
-- Порядок ВАЖЕН для существующих данных: сперва создаём новую таблицу,
-- ЗАТЕМ переносим в неё каждую старую Booking.serviceId, и ТОЛЬКО ПОСЛЕ
-- этого удаляем старую колонку/constraint — иначе данные о том, какая
-- услуга была в каждой существующей записи, потерялись бы безвозвратно.

-- CreateTable
CREATE TABLE "BookingService" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingService_bookingId_idx" ON "BookingService"("bookingId");

-- CreateIndex
CREATE INDEX "BookingService_serviceId_idx" ON "BookingService"("serviceId");

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: перенос существующих Booking.serviceId в BookingService.
-- durationMin/priceCents берём из Service НА МОМЕНТ МИГРАЦИИ (лучшее
-- доступное приближение — сама Booking исторически не хранила снимок
-- длительности услуги отдельно от Booking.endsAt, так что абсолютной
-- исторической точности тут в принципе нет, но услуга/её текущие
-- цифры — куда лучше, чем полная потеря связи).
INSERT INTO "BookingService" ("id", "bookingId", "serviceId", "durationMin", "priceCents", "createdAt")
SELECT gen_random_uuid()::text, b."id", b."serviceId", s."durationMin", s."priceCents", b."createdAt"
FROM "Booking" b
JOIN "Service" s ON s."id" = b."serviceId";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_serviceId_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "serviceId";
