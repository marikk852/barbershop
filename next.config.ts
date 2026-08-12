import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Фото портфолио грузятся из Vercel Blob (см. /api/admin/portfolio/upload) —
    // хост вида <случайный-id>.public.blob.vercel-storage.com, уникальный на
    // каждое blob-хранилище. Wildcard, а не точный хост одного стора — тот же
    // паттерн покрывает и другие окружения (preview/др. проекты), если когда-
    // нибудь заведётся второй store, без повторной правки конфига.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
