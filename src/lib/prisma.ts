import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 требует драйвер-адаптер для SQL-баз — движок больше не
// генерируется в node_modules. Один и тот же адаптер (pg) работает и
// с локальным Postgres, и с Neon в проде: обычное TCP-соединение,
// без переключения адаптеров между окружениями.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
