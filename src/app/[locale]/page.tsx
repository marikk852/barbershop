import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// SiteScene (заставка + лезвие-шапка) живёт на уровне layout — здесь только
// содержимое, которое проступает под шапкой после того как она пристыкуется.
export default async function HomePage() {
  const t = await getTranslations("Home");

  return (
    <main
      className="mx-auto flex max-w-2xl flex-col items-center px-6 pb-24 text-center"
      style={{ paddingTop: "calc(var(--dock-h) + 18vh)" }}
    >
      <h1 className="font-serif text-4xl tracking-wide">{t("title")}</h1>
      <p className="mt-2 text-sm uppercase tracking-[0.3em] text-red">{t("tagline")}</p>

      <Link
        href="/price"
        className="mt-10 border border-white/20 px-6 py-3 text-sm uppercase tracking-[0.14em] text-zinc-200 hover:border-red hover:text-red"
      >
        {t("cta")}
      </Link>
    </main>
  );
}
