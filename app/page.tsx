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

  const sectionStyle = {
    padding: "clamp(32px, 8vw, 48px) clamp(20px, 5vw, 32px)",
    maxWidth: 640,
    margin: "0 auto",
  };

  const h2Style = {
    margin: "0 0 16px 0",
    fontSize: "clamp(20px, 5vw, 24px)",
    fontWeight: 600,
    color: "var(--text-primary)",
  };

  const pStyle = {
    margin: 0,
    fontSize: "clamp(15px, 3.8vw, 17px)",
    lineHeight: 1.6,
    color: "var(--text-secondary)",
  };

  const cardStyle = {
    padding: "clamp(16px, 4vw, 20px)",
    background: "var(--bg-secondary)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border)",
    marginBottom: 12,
  };

  return (
    <main className="min-h-screen bg-bg">
      {/* Hero */}
      <section style={{ ...sectionStyle, paddingTop: "clamp(48px, 12vw, 72px)", textAlign: "center" }}>
        <h1
          style={{
            margin: "0 0 12px 0",
            fontSize: "clamp(24px, 6vw, 32px)",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.2,
          }}
        >
          {t("appName")}
        </h1>
        <p style={{ ...pStyle, marginBottom: 8, fontSize: "clamp(18px, 4.5vw, 22px)", color: "var(--text-primary)" }}>
          {t("homeHero")}
        </p>
        <p style={{ ...pStyle, marginBottom: "clamp(24px, 6vw, 32px)" }}>{t("homeHeroSub")}</p>
        <div className="flex flex-col gap-3" style={{ maxWidth: 320, margin: "0 auto" }}>
          <Link href="/aula-experimental" className="btn btn-primary w-full" style={{ textDecoration: "none" }}>
            {t("ctaTrial")}
          </Link>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/sign-in" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              {t("signIn")}
            </Link>
            <Link href="/sign-up" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              {t("signUp")}
            </Link>
          </div>
        </div>
      </section>

      {/* Sobre Nós */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>{t("homeAboutTitle")}</h2>
        <p style={pStyle}>{t("homeAboutText")}</p>
      </section>

      {/* Missão */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>{t("homeMissionTitle")}</h2>
        <p style={pStyle}>{t("homeMissionText")}</p>
      </section>

      {/* Visão */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>{t("homeVisionTitle")}</h2>
        <p style={pStyle}>{t("homeVisionText")}</p>
      </section>

      {/* Valores */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>{t("homeValuesTitle")}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={cardStyle}>
            <strong style={{ color: "var(--primary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>{t("homeValue1")}</strong>
            <p style={{ ...pStyle, marginTop: 6, fontStyle: "italic" }}>"{t("homeValue1Quote")}"</p>
          </div>
          <div style={cardStyle}>
            <strong style={{ color: "var(--primary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>{t("homeValue2")}</strong>
            <p style={{ ...pStyle, marginTop: 6, fontStyle: "italic" }}>"{t("homeValue2Quote")}"</p>
          </div>
          <div style={cardStyle}>
            <strong style={{ color: "var(--primary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>{t("homeValue3")}</strong>
            <p style={{ ...pStyle, marginTop: 6, fontStyle: "italic" }}>"{t("homeValue3Quote")}"</p>
          </div>
          <div style={cardStyle}>
            <strong style={{ color: "var(--primary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>{t("homeValue4")}</strong>
          </div>
          <div style={cardStyle}>
            <strong style={{ color: "var(--primary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>{t("homeValue5")}</strong>
          </div>
        </div>
      </section>

      {/* Para que serve a plataforma */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>{t("homePlatformTitle")}</h2>
        <p style={{ ...pStyle, marginBottom: 20 }}>{t("homePlatformText")}</p>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          <li>{t("homePlatformBullet1")}</li>
          <li>{t("homePlatformBullet2")}</li>
          <li>{t("homePlatformBullet3")}</li>
          <li>{t("homePlatformBullet4")}</li>
          <li>{t("homePlatformBullet5")}</li>
        </ul>
      </section>

      {/* CTA final */}
      <section style={{ ...sectionStyle, paddingBottom: "clamp(48px, 12vw, 64px)", textAlign: "center" }}>
        <h2 style={{ ...h2Style, marginBottom: 20 }}>{t("homeCtaTitle")}</h2>
        <div className="flex flex-col gap-3" style={{ maxWidth: 320, margin: "0 auto" }}>
          <Link href="/aula-experimental" className="btn btn-primary w-full" style={{ textDecoration: "none" }}>
            {t("ctaTrial")}
          </Link>
          <Link href="/sign-in" className="btn btn-secondary w-full" style={{ textDecoration: "none" }}>
            {t("signIn")}
          </Link>
        </div>
      </section>
    </main>
  );
}
