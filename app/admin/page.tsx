import Link from "next/link";
import { Suspense } from "react";
import { BarChart3, CalendarPlus, ChevronRight, Receipt, UserPlus, Wallet } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getCachedResolvedAdminAccess } from "@/lib/permissions/get-cached-resolved";
import { canAccessAdminPathname, isGranularRestrictedDashboard } from "@/lib/permissions/paths";
import { hasAllV1AdminPermissions } from "@/lib/permissions/resolve";
import { getCachedSchools } from "@/lib/cached-reference-data";
import { getAdminDashboardStatsCached } from "@/lib/admin-dashboard-stats";
import { getTodayTrialClassesForAdmin } from "@/lib/today-trial-classes";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { getAdminShellNav } from "@/lib/admin-nav-areas";
import { AdminNavSearch } from "@/components/admin/AdminNavSearch";
import { TodayTrialClassesHighlight } from "@/components/TodayTrialClassesHighlight";
import { AdminSchoolFilter } from "./AdminSchoolFilter";
import { AdminTodoSummary } from "./dashboard/AdminTodoSummary";
import { AdminHojeToday } from "./AdminHojeToday";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ school?: string }>;

function euro(n: number) {
  return `${Math.round(n).toLocaleString("pt-PT")} €`;
}

/** «Hoje»: a página inicial única do admin — o que tratar, atalhos, aulas do dia e o mês em dois números. */
export default async function AdminHojePage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const t = getTranslations(locale);
  const { school } = await searchParams;
  const schoolId = school?.trim() || null;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const client = result.client;

  const access = await getCachedResolvedAdminAccess();
  const full = !(isGranularRestrictedDashboard(access) && !hasAllV1AdminPermissions(access));
  const can = (href: string) => access.kind !== "granted" || canAccessAdminPathname(access, href);
  const { searchItems } = getAdminShellNav(t, access);

  const [schools, todayTrials, stats] = await Promise.all([
    getCachedSchools(client),
    can("/admin/experimentais") ? getTodayTrialClassesForAdmin(client, schoolId) : Promise.resolve([]),
    full ? getAdminDashboardStatsCached(client, schoolId) : Promise.resolve(null),
  ]);

  const firstName = (dbUser?.name ?? "").trim().split(/\s+/)[0] || "Admin";
  const dateLabel = new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Lisbon" });

  const shortcuts = [
    { href: "/admin/financeiro/novo", label: "Registar pagamento", icon: <Wallet size={20} aria-hidden /> },
    { href: "/admin/alunos/novo", label: "Novo aluno", icon: <UserPlus size={20} aria-hidden /> },
    { href: "/admin/loja/vendas/novo", label: "Registar venda", icon: <Receipt size={20} aria-hidden /> },
    { href: "/admin/experimentais/novo", label: "Aula experimental", icon: <CalendarPlus size={20} aria-hidden /> },
  ].filter((s) => can(s.href));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 22px)", minWidth: 0, overflowX: "hidden", maxWidth: 1100 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 800 }}>Olá, {firstName}</h1>
          <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--text-secondary)", textTransform: "capitalize" }}>{dateLabel}</p>
        </div>
        {schools.length > 1 ? <AdminSchoolFilter schools={schools} currentSchoolId={schoolId} /> : null}
      </div>

      <div className="admin-mobile-only">
        <AdminNavSearch items={searchItems} />
      </div>

      {full ? (
        <Suspense fallback={<div className="card" style={{ minHeight: 160 }} aria-busy="true" />}>
          <AdminTodoSummary client={client} schoolId={schoolId} />
        </Suspense>
      ) : (
        <p style={{ margin: 0, maxWidth: 560, fontSize: 15, lineHeight: 1.6, color: "var(--text-secondary)" }}>{t("adminGranularHomeHint")}</p>
      )}

      {shortcuts.length > 0 && (
        <nav aria-label="Atalhos" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: 10 }}>
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="card"
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", minHeight: 52, textDecoration: "none", color: "var(--text-primary)", fontSize: 14, fontWeight: 700 }}
            >
              <span style={{ color: "var(--primary)", display: "inline-flex" }}>{s.icon}</span>
              {s.label}
            </Link>
          ))}
        </nav>
      )}

      {todayTrials.length > 0 && (
        <TodayTrialClassesHighlight
          trials={todayTrials}
          modalityLabels={MODALITY_LABELS}
          labels={{
            title: t("todayTrialsTitle"),
            subtitle: t("todayTrialsSubtitle"),
            pendingBadge: t("todayTrialsPending"),
            acceptedBadge: t("todayTrialsAccepted"),
            viewAll: t("todayTrialsViewAll"),
            goToLesson: t("adminViewLesson"),
          }}
          manageHref="/admin/experimentais"
        />
      )}

      {can("/coach/aula") && (
        <Suspense fallback={<div className="card" style={{ minHeight: 120 }} aria-busy="true" />}>
          <AdminHojeToday client={client} schoolId={schoolId} />
        </Suspense>
      )}

      {stats && (
        <section aria-label="Este mês" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: 10 }}>
          <Link href="/admin/alunos" className="card" style={{ padding: 14, textDecoration: "none", color: "var(--text-primary)" }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.activeStudents}</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>alunos ativos</div>
          </Link>
          <Link href="/admin/financeiro" className="card" style={{ padding: 14, textDecoration: "none", color: "var(--text-primary)" }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{euro(stats.receivedThisMonth)}</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>recebido este mês · faltam {euro(Math.max(0, stats.projectedMonthlyRevenue - stats.receivedThisMonth))}</div>
          </Link>
          <Link href="/admin/dashboard" className="card" style={{ padding: 14, textDecoration: "none", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10 }}>
            <BarChart3 size={22} aria-hidden style={{ color: "var(--primary)" }} />
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>Relatórios</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)" }}>KPIs, alunos, dinheiro e treino</span>
            </span>
            <ChevronRight size={18} aria-hidden style={{ color: "var(--text-secondary)" }} />
          </Link>
        </section>
      )}
    </div>
  );
}
