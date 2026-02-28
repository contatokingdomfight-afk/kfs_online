import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { setViewAsAndRedirect } from "./actions";

export default async function AdminHomePage() {
  const dbUser = await getCurrentDbUser();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-secondary)" }}>
        {t("helloAdmin")} {dbUser?.name || t("admin")}.
      </p>

      <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)" }}>
        <h2 style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("viewAs")}
        </h2>
        <p style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {t("viewAsHint")}
        </p>
        <form action={setViewAsAndRedirect} style={{ display: "flex", flexWrap: "wrap", gap: "clamp(10px, 2.5vw, 12px)" }}>
          <button
            type="submit"
            name="viewAs"
            value="aluno"
            className="btn btn-primary"
            style={{
              width: "auto",
              minWidth: "clamp(140px, 35vw, 180px)",
            }}
          >
            {t("viewAsStudent")}
          </button>
          <button
            type="submit"
            name="viewAs"
            value="coach"
            className="btn btn-secondary"
            style={{
              width: "auto",
              minWidth: "clamp(140px, 35vw, 180px)",
            }}
          >
            {t("viewAsCoach")}
          </button>
        </form>
      </section>

      <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
        <h2 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("management")}
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(12px, 3vw, 16px)" }}>
          <li>
            <Link href="/admin/alunos" style={{ color: "var(--primary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500, display: "block", padding: "clamp(10px, 2.5vw, 12px) 0" }}>
              {t("navStudents")} →
            </Link>
          </li>
          <li>
            <Link href="/admin/atletas" style={{ color: "var(--primary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500, display: "block", padding: "clamp(10px, 2.5vw, 12px) 0" }}>
              {t("navAthletes")} →
            </Link>
          </li>
          <li>
            <Link href="/admin/turmas" style={{ color: "var(--primary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500, display: "block", padding: "clamp(10px, 2.5vw, 12px) 0" }}>
              {t("navClasses")} →
            </Link>
          </li>
          <li>
            <Link href="/admin/presenca" style={{ color: "var(--primary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500, display: "block", padding: "clamp(10px, 2.5vw, 12px) 0" }}>
              {t("navPresence")} →
            </Link>
          </li>
          <li>
            <Link href="/admin/financeiro" style={{ color: "var(--primary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500, display: "block", padding: "clamp(10px, 2.5vw, 12px) 0" }}>
              {t("navFinance")} →
            </Link>
          </li>
          <li>
            <Link href="/admin/experimentais" style={{ color: "var(--primary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500, display: "block", padding: "clamp(10px, 2.5vw, 12px) 0" }}>
              {t("trialsLink")} →
            </Link>
          </li>
          <li>
            <Link href="/admin/coaches" style={{ color: "var(--primary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500, display: "block", padding: "clamp(10px, 2.5vw, 12px) 0" }}>
              {t("navCoaches")} →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
