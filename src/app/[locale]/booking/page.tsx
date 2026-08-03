import { getTranslations } from "next-intl/server";

// Заглушка — настоящая запись со слотами и календарём (задача #7)
// ещё не построена. Страница нужна, чтобы пункт меню не вёл в никуда.
export default async function BookingPage() {
  const t = await getTranslations("Booking");

  return (
    <main className="mx-auto max-w-2xl px-6 pb-16" style={{ paddingTop: "calc(var(--scene-h) + 2.5rem)" }}>
      <h1 className="font-serif text-3xl tracking-wide">{t("title")}</h1>
      <p className="mt-6 text-lg text-zinc-400">{t("soon")}</p>
    </main>
  );
}
