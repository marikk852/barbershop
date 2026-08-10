-- AlterTable
ALTER TABLE "AdminUser" ALTER COLUMN "telegramId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "AdminUser_username_idx" ON "AdminUser"("username");
