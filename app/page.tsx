import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";

type Props = { searchParams: Promise<{ code?: string; next?: string }> };

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  if (params.code) {
    const next = params.next ? `&next=${encodeURIComponent(params.next)}` : "";
    redirect(`/auth/callback?code=${params.code}${next}`);
  }

  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg">
      <div className="container-mobile">
        <h1 className="text-mobile-lg font-semibold text-center mb-3" style={{ color: "var(--text-primary)" }}>
          {t("appName")}
        </h1>
        <p className="text-mobile-base text-center mb-8" style={{ color: "var(--text-secondary)" }}>
          {t("tagline")}
        </p>
        <div className="flex flex-col gap-4">
          <Link href="/aula-experimental" className="btn btn-primary w-full" style={{ textDecoration: "none" }}>
            {t("ctaTrial")}
          </Link>
          <Link href="/sign-in" className="btn btn-secondary w-full" style={{ textDecoration: "none" }}>
            {t("signIn")}
          </Link>
          <Link href="/sign-up" className="btn btn-secondary w-full" style={{ textDecoration: "none" }}>
            {t("signUp")}
          </Link>
        </div>
      </div>
    </main>
  );
}
