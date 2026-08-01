import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Временная страница-заглушка — доказывает, что маршрутизация, i18n и
// подключение к базе работают. Настоящая заставка и 3D-сцена с шаветтой
// (prototypes/index.html) переносятся сюда отдельной задачей.
export default function HomePage() {
  const t = useTranslations("Home");
  const nav = useTranslations("Nav");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="font-serif text-4xl tracking-wide">{t("title")}</h1>
        <p className="mt-2 text-sm uppercase tracking-[0.3em] text-red-600">
          {t("tagline")}
        </p>
      </div>

      <nav className="flex flex-col gap-3 text-lg">
        <span>{nav("booking")}</span>
        <span>{nav("bio")}</span>
        <span>{nav("price")}</span>
        <span>{nav("portfolio")}</span>
      </nav>

      <div className="flex gap-4 text-sm text-zinc-400">
        <Link href="/" locale="ru" className="underline underline-offset-4">
          RU
        </Link>
        <Link href="/" locale="ro" className="underline underline-offset-4">
          RO
        </Link>
      </div>
    </main>
  );
}
