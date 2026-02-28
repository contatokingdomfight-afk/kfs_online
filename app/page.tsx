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
    <main className="min-h-screen bg-bg home-page">
      {/* Sticky header - mobile friendly */}
      <header className="home-header">
        <span className="home-logo">{t("appName")}</span>
        <Link href="/aula-experimental" className="home-cta-btn">
          {t("ctaTrial")}
        </Link>
      </header>

      {/* Hero */}
      <section className="home-hero">
        <h1 className="home-hero-title">{t("appName")}</h1>
        <p className="home-hero-lead">{t("homeHero")}</p>
        <p className="home-hero-sub">{t("homeHeroSub")}</p>
        <div className="home-hero-btns">
          <Link href="/aula-experimental" className="btn btn-primary home-btn-primary">
            {t("ctaTrial")}
          </Link>
          <div className="home-hero-secondary">
            <Link href="/sign-in" className="btn btn-secondary home-btn">
              {t("signIn")}
            </Link>
            <Link href="/sign-up" className="btn btn-secondary home-btn">
              {t("signUp")}
            </Link>
          </div>
        </div>
      </section>

      {/* Sobre Nós */}
      <section className="home-section">
        <h2 className="home-h2">{t("homeAboutTitle")}</h2>
        <p className="home-p">{t("homeAboutText")}</p>
      </section>

      {/* Missão */}
      <section className="home-section">
        <h2 className="home-h2">{t("homeMissionTitle")}</h2>
        <p className="home-p">{t("homeMissionText")}</p>
      </section>

      {/* Visão */}
      <section className="home-section">
        <h2 className="home-h2">{t("homeVisionTitle")}</h2>
        <p className="home-p">{t("homeVisionText")}</p>
      </section>

      {/* Valores */}
      <section className="home-section">
        <h2 className="home-h2">{t("homeValuesTitle")}</h2>
        <div className="home-values">
          <div className="home-value-card">
            <strong className="home-value-title">{t("homeValue1")}</strong>
            <p className="home-value-quote">&quot;{t("homeValue1Quote")}&quot;</p>
          </div>
          <div className="home-value-card">
            <strong className="home-value-title">{t("homeValue2")}</strong>
            <p className="home-value-quote">&quot;{t("homeValue2Quote")}&quot;</p>
          </div>
          <div className="home-value-card">
            <strong className="home-value-title">{t("homeValue3")}</strong>
            <p className="home-value-quote">&quot;{t("homeValue3Quote")}&quot;</p>
          </div>
          <div className="home-value-card">
            <strong className="home-value-title">{t("homeValue4")}</strong>
          </div>
          <div className="home-value-card">
            <strong className="home-value-title">{t("homeValue5")}</strong>
          </div>
        </div>
      </section>

      {/* Para que serve a plataforma */}
      <section className="home-section">
        <h2 className="home-h2">{t("homePlatformTitle")}</h2>
        <p className="home-p home-p-mb">{t("homePlatformText")}</p>
        <ul className="home-list">
          <li>{t("homePlatformBullet1")}</li>
          <li>{t("homePlatformBullet2")}</li>
          <li>{t("homePlatformBullet3")}</li>
          <li>{t("homePlatformBullet4")}</li>
          <li>{t("homePlatformBullet5")}</li>
        </ul>
      </section>

      {/* CTA final */}
      <section className="home-section home-cta-section">
        <h2 className="home-h2">{t("homeCtaTitle")}</h2>
        <div className="home-cta-btns">
          <Link href="/aula-experimental" className="btn btn-primary home-btn-primary">
            {t("ctaTrial")}
          </Link>
          <Link href="/sign-in" className="btn btn-secondary home-btn-primary">
            {t("signIn")}
          </Link>
        </div>
      </section>
    </main>
  );
}
