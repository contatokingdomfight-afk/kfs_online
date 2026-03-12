import Link from "next/link";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";

export default async function LojaPage() {
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(24px, 6vw, 32px)" }}>
      <div>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("storeTitle")}
        </h1>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {t("storeDescription")}
        </p>
      </div>

      <div className="card" style={{ padding: "clamp(24px, 6vw, 32px)" }}>
        <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {t("storeComingSoon")}
        </p>
        <p style={{ margin: "16px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {t("storeMeanwhile")}{" "}
          <Link href="/dashboard/biblioteca" style={{ color: "var(--primary)", textDecoration: "underline" }}>
            {t("libraryTitle")}
          </Link>
          {" · "}
          <Link href="/dashboard/eventos" style={{ color: "var(--primary)", textDecoration: "underline" }}>
            {t("coursesAndEvents")}
          </Link>
        </p>
      </div>
    </div>
  );
}
