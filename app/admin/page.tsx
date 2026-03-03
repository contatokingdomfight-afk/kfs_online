import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getAdminDashboardStats } from "@/lib/admin-dashboard-stats";
import { AdminSchoolFilter } from "./AdminSchoolFilter";
import { AdminDashboardCharts } from "./AdminDashboardCharts";
import { Suspense } from "react";

type SearchParams = Promise<{ school?: string }>;

export default async function AdminHomePage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const params = await searchParams;
  const schoolId = (params.school?.trim() || null) || null;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const stats = await getAdminDashboardStats(result.client, schoolId);

  const modalityNames: Record<string, string> = {};
  stats.studentsByModality.forEach((m) => {
    modalityNames[m.modalityCode] = m.modalityName;
  });
  const modalityCodes = stats.studentsByModality.map((m) => m.modalityCode).filter((c) => c !== "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)", minWidth: 0, overflowX: "hidden" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "clamp(12px, 3vw, 16px)", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-secondary)" }}>
          {t("helloAdmin")} {dbUser?.name || t("admin")}.
        </p>
        <Suspense fallback={<span style={{ color: "var(--text-secondary)" }}>Escola: …</span>}>
          <AdminSchoolFilter schools={stats.schools} currentSchoolId={schoolId} />
        </Suspense>
      </div>

      {/* KPIs – grid responsivo: mobile 2 colunas, desktop auto-fill */}
      <section className="admin-dashboard-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "clamp(10px, 2.5vw, 16px)" }}>
        <div className="card" style={{ padding: "clamp(12px, 3vw, 18px)", minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Alunos totais</div>
          <div style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: "var(--text-primary)" }}>{stats.totalStudents}</div>
        </div>
        {stats.studentsByModality.map((m) => (
          <div key={m.modalityCode || "sem"} className="card" style={{ padding: "clamp(12px, 3vw, 18px)", minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{m.modalityName}</div>
            <div style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: "var(--text-primary)" }}>{m.count}</div>
          </div>
        ))}
        <div className="card" style={{ padding: "clamp(12px, 3vw, 18px)", minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Receita do mês</div>
          <div style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: "var(--success)" }}>
            {Number(stats.revenueCurrentMonth).toFixed(0)} €
          </div>
        </div>
        <div className="card" style={{ padding: "clamp(12px, 3vw, 18px)", minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Receita acum. (12 meses)</div>
          <div style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: "var(--text-primary)" }}>
            {stats.revenueAccumulatedMonths.reduce((s, r) => s + r.revenue, 0).toFixed(0)} €
          </div>
        </div>
      </section>

      {/* Gráficos */}
      <Suspense fallback={<div className="card" style={{ padding: 24, color: "var(--text-secondary)" }}>A carregar gráficos…</div>}>
        <AdminDashboardCharts
          schools={stats.schools}
          currentSchoolId={schoolId}
          totalStudents={stats.totalStudents}
          studentsByModality={stats.studentsByModality}
          revenueCurrentMonth={stats.revenueCurrentMonth}
          revenueAccumulatedMonths={stats.revenueAccumulatedMonths}
          attendanceByDay={stats.attendanceByDay}
          modalityCodes={modalityCodes}
          modalityNames={modalityNames}
        />
      </Suspense>

      <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minWidth: 0 }}>
        <h2 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("management")}
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(12px, 3vw, 16px)" }}>
          <li>
            <Link href="/admin/escolas" style={{ color: "var(--primary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500, display: "block", padding: "clamp(10px, 2.5vw, 12px) 0" }}>
              {t("navSchools")} →
            </Link>
          </li>
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
