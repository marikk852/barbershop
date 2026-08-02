import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";

// Заглушка — настоящая запись со слотами и календарём (задача #7)
// ещё не построена. Страница нужна, чтобы пункт меню не вёл в никуда.
export default async function BookingPage() {
  const t = await getTranslations("Booking");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-serif text-3xl tracking-wide">{t("title")}</h1>
        <p className="mt-6 text-lg text-zinc-400">{t("soon")}</p>
      </main>
    </>
  );
}
