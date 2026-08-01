import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Временная страница-заглушка — доказывает, что маршрутизация, i18n и
// подключение к базе работают. Настоящая заставка и 3D-сцена с шаветтой
// (prototypes/index.html) переносятся сюда отдельной задачей. Нав теперь
// в SiteHeader (общий для всех страниц), здесь просто витрина+переход.
export default function HomePage() {
  const t = useTranslations("Home");

  return (
    <main className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="font-serif text-4xl tracking-wide">{t("title")}</h1>
        <p className="mt-2 text-sm uppercase tracking-[0.3em] text-red">{t("tagline")}</p>
      </div>

      <Link
        href="/price"
        className="mt-4 border border-white/20 px-6 py-3 text-sm uppercase tracking-[0.14em] text-zinc-200 hover:border-red hover:text-red"
      >
        {t("cta")}
      </Link>
    </main>
  );
}
