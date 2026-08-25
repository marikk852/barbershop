-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('SITE', 'MANUAL');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'SITE',
ALTER COLUMN "clientPhone" DROP NOT NULL;
