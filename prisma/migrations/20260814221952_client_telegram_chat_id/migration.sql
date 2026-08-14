-- clientTelegramChatId — chat_id клиента в Telegram, заполняется после
-- перехода по ссылке "Получать уведомления в Telegram" на экране успеха
-- (см. /api/telegram/webhook). NULLABLE, чисто аддитивная колонка —
-- никакого риска для существующих данных.
ALTER TABLE "Booking" ADD COLUMN     "clientTelegramChatId" BIGINT;
