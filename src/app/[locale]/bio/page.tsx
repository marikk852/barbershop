import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/routing";

export default async function BioPage() {
  const t = await getTranslations("Bio");
  const locale = (await getLocale()) as Locale;

  const content = await prisma.siteContent.findUnique({ where: { id: 1 } });
  const bio = locale === "ro" ? content?.bioRo : content?.bioRu;

  return (
    <main className="mx-auto max-w-2xl px-6 pb-16" style={{ paddingTop: "calc(var(--scene-h) + 2.5rem)" }}>
      <h1 className="font-serif text-3xl tracking-wide">{t("title")}</h1>
      <p className="mt-8 text-lg leading-relaxed text-zinc-200">{bio}</p>
      {content?.address && (
        <p className="mt-8 text-sm uppercase tracking-[0.14em] text-zinc-500">
          {content.address}
        </p>
      )}
      {(content?.phone || content?.instagram || content?.telegramUsername) && (
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-400">
          {content.phone && <a href={`tel:${content.phone.replace(/[^\d+]/g, "")}`}>{content.phone}</a>}
          {content.instagram && (
            <a href={`https://instagram.com/${content.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer">
              @{content.instagram.replace(/^@/, "")}
            </a>
          )}
          {content.telegramUsername && (
            <a href={`https://t.me/${content.telegramUsername.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer">
              @{content.telegramUsername.replace(/^@/, "")}
            </a>
          )}
        </p>
      )}
    </main>
  );
}
