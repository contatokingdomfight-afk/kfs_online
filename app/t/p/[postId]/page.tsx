import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getPublicOrigin } from "@/lib/site-public-url";
import { rewriteSupabaseLegacyStoragePublicUrl } from "@/lib/supabase/rewrite-storage-public-url";

type Props = { params: Promise<{ postId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  const admin = getAdminClientOrNull();
  const base = getPublicOrigin();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  if (!admin.client) {
    return { title: t("tribePublicTitle"), description: t("tribePublicSubtitle") };
  }
  const { data: post } = await admin.client
    .from("TribePost")
    .select("id, body, visibility, status")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.status !== "ACTIVE") {
    return { title: t("tribePublicTitle"), description: t("tribePublicSubtitle") };
  }
  const vis = post.visibility as string;
  const title = vis === "ALL_SCHOOLS" ? `${t("tribeTitle")} · Kingdom Fight School` : t("tribePublicTitle");
  const description =
    vis === "ALL_SCHOOLS"
      ? String(post.body ?? "").slice(0, 155) || t("tribePublicGlobalPost")
      : t("tribePublicSchoolPost");
  let image: string | undefined;
  if (vis === "ALL_SCHOOLS") {
    const { data: m } = await admin.client.from("TribePostMedia").select("publicUrl").eq("postId", postId).order("sortOrder", { ascending: true }).limit(1).maybeSingle();
    const raw = m?.publicUrl as string | undefined;
    if (raw) image = rewriteSupabaseLegacyStoragePublicUrl(raw) ?? raw;
  }
  return {
    metadataBase: new URL(base),
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${base}/t/p/${postId}`,
      type: "article",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}

export default async function TribePublicPostPage({ params }: Props) {
  const { postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(`/dashboard/tribo?post=${encodeURIComponent(postId)}`);
  }

  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const admin = getAdminClientOrNull();
  const nextTarget = `/dashboard/tribo?post=${encodeURIComponent(postId)}`;
  const signUpHref = `/sign-up?next=${encodeURIComponent(nextTarget)}`;
  const signInHref = `/sign-in?next=${encodeURIComponent(nextTarget)}`;

  let showExcerpt = false;
  let excerpt = "";
  let imageUrl: string | null = null;
  if (admin.client) {
    const { data: post } = await admin.client.from("TribePost").select("body, visibility, status").eq("id", postId).maybeSingle();
    if (post?.status === "ACTIVE" && post.visibility === "ALL_SCHOOLS") {
      showExcerpt = true;
      excerpt = String(post.body ?? "").slice(0, 220);
      const { data: m } = await admin.client
        .from("TribePostMedia")
        .select("publicUrl")
        .eq("postId", postId)
        .order("sortOrder", { ascending: true })
        .limit(1)
        .maybeSingle();
      const raw = m?.publicUrl as string | undefined;
      imageUrl = raw ? rewriteSupabaseLegacyStoragePublicUrl(raw) ?? raw : null;
    }
  }

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
          {t("tribePublicTitle")}
        </h1>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          {t("tribePublicSubtitle")}
        </p>
        {showExcerpt && excerpt ? (
          <blockquote className="text-sm mb-4 p-3 rounded-xl" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
            {excerpt}
            {excerpt.length >= 220 ? "…" : ""}
          </blockquote>
        ) : null}
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="w-full max-h-56 object-cover rounded-xl mb-5" />
        ) : null}
        <div className="flex flex-col gap-2">
          <Link href={signUpHref} className="btn btn-primary w-full text-center">
            {t("tribePublicCta")}
          </Link>
          <Link href={signInHref} className="btn btn-secondary w-full text-center">
            {t("tribePublicLogin")}
          </Link>
        </div>
      </div>
    </main>
  );
}
