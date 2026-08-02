import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/routing";
import { SiteHeader } from "@/components/site-header";

export default async function BioPage() {
  const t = await getTranslations("Bio");
  const locale = (await getLocale()) as Locale;

  const content = await prisma.siteContent.findUnique({ where: { id: 1 } });
  const bio = locale === "ro" ? content?.bioRo : content?.bioRu;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-serif text-3xl tracking-wide">{t("title")}</h1>
        <p className="mt-8 text-lg leading-relaxed text-zinc-200">{bio}</p>
        {content?.address && (
          <p className="mt-8 text-sm uppercase tracking-[0.14em] text-zinc-500">
            {content.address}
          </p>
        )}
      </main>
    </>
  );
}
