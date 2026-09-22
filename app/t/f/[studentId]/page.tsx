import Link from "next/link";
import type { Metadata } from "next";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getFighterCardData } from "@/lib/fighter-card";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getPublicOrigin } from "@/lib/site-public-url";

type Props = { params: Promise<{ studentId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studentId } = await params;
  const base = getPublicOrigin();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const imageUrl = `${base}/t/f/${studentId}/image`;

  const admin = getAdminClientOrNull();
  let title = t("fighterCardPublicTitle");
  const description = t("fighterCardPublicSubtitle");
  if (admin.client) {
    const result = await getFighterCardData(admin.client, studentId);
    if (result.ok) title = `${result.data.name} · ${t("fighterCardPublicTitle")}`;
  }

  return {
    metadataBase: new URL(base),
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${base}/t/f/${studentId}`,
      type: "profile",
      images: [{ url: imageUrl, width: 1080, height: 1920 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export default async function FighterCardPublicPage({ params }: Props) {
  const { studentId } = await params;
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const admin = getAdminClientOrNull();

  const result = admin.client ? await getFighterCardData(admin.client, studentId) : { ok: false as const, reason: "not_found" as const };
  const imageUrl = `/t/f/${studentId}/image`;
  const trialHref = `/aula-experimental?ref=${encodeURIComponent(studentId)}`;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <div
        className="w-full max-w-md rounded-2xl p-6 tribe-card-enter"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.2)",
        }}
      >
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--primary)" }}>
          Kingdom Fight School
        </p>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          {t("fighterCardPublicTitle")}
        </h1>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          {t("fighterCardPublicSubtitle")}
        </p>

        {result.ok ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={result.data.name} className="w-full rounded-xl mb-5" style={{ aspectRatio: "9 / 16" }} />
        ) : (
          <p className="text-sm mb-5 p-3 rounded-xl" style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}>
            {t("fighterCardPublicUnavailable")}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Link href={trialHref} className="btn btn-primary w-full text-center">
            {t("fighterCardPublicCta")}
          </Link>
          <Link href="/" className="btn btn-secondary w-full text-center">
            {t("fighterCardPublicHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
