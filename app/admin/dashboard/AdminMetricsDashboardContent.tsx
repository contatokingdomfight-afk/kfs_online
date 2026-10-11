import type { SupabaseClient } from "@supabase/supabase-js";
import { Users, Whistle, AlertTriangle, TrendingUp, DoorOpen, CalendarCheck, Wallet } from "lucide-react";
import { getAdminDashboardStatsCached } from "@/lib/admin-dashboard-stats";
import { getKpiTrends } from "@/lib/admin-kpi-trends";
import { KpiCardGrid } from "../_components/KpiCardGrid";
import { getTranslations } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { hasAllV1AdminPermissions, type ResolvedAdminAccess } from "@/lib/permissions/resolve";
import { isGranularRestrictedDashboard } from "@/lib/permissions/paths";

type Props = {
  client: SupabaseClient;
  schoolId: string | null;
  access: ResolvedAdminAccess;
};

export async function AdminMetricsDashboardContent({ client, schoolId, access }: Props) {
  const [locale, stats, trends] = await Promise.all([
    getLocaleFromCookies(),
    getAdminDashboardStatsCached(client, schoolId),
    getKpiTrends(client, schoolId),
  ]);
  const vs = `vs. ${trends.prevMonthLabel}`;
  const fmt = (n: number) => n.toLocaleString("pt-PT", { maximumFractionDigits: 1 });
  const deltaTrend = (delta: number, higherIsGood: boolean, suffix = "") =>
    delta === 0
      ? { text: `= igual a ${trends.prevMonthLabel}${suffix}`, tone: "neutral" as const }
      : {
          text: `${delta > 0 ? "▲ +" : "▼ −"}${fmt(Math.abs(delta))} ${vs}${suffix}`,
          tone: (delta > 0) === higherIsGood ? ("good" as const) : ("bad" as const),
        };
  const t = getTranslations(locale as "pt" | "en");

  if (isGranularRestrictedDashboard(access) && !hasAllV1AdminPermissions(access)) {
    return (
      <p
        style={{
          margin: 0,
          maxWidth: 560,
          fontSize: "clamp(15px, 3.8vw, 17px)",
          lineHeight: 1.6,
          color: "var(--text-secondary)",
        }}
      >
        {t("adminGranularHomeHint")}
      </p>
    );
  }

  return (
    <>
      <KpiCardGrid
        cards={[
          {
            href: "/admin/alunos",
            icon: <Users size={24} aria-hidden />,
            value: String(stats.activeStudents),
            label: t("adminActiveStudents"),
            info: t("adminActiveStudentsInfo"),
            trend: deltaTrend(trends.activeDelta, true),
          },
          {
            href: "/admin/coaches",
            icon: <Whistle size={24} aria-hidden />,
            value: String(stats.activeCoaches),
            label: t("adminActiveCoaches"),
            info: t("adminActiveCoachesInfo"),
          },
          {
            href: "/admin/financeiro",
            icon: <AlertTriangle size={24} aria-hidden />,
            value: `${stats.delinquencyRate.percent.toFixed(1)}%`,
            label: t("adminDelinquencyRate"),
            info: t("adminDelinquencyRateInfo"),
          },
          {
            href: "/admin/financeiro",
            icon: <Wallet size={24} aria-hidden />,
            value: `${stats.receivedThisMonth.toFixed(0)} €`,
            label: "Recebido este mês",
            info: "Mensalidades pagas com referência a este mês, face à receita prevista (preço do plano de cada aluno ativo; nas famílias, o valor do grupo).",
            progress: stats.projectedMonthlyRevenue > 0 ? stats.receivedThisMonth / stats.projectedMonthlyRevenue : 0,
            trend: { text: `de ${stats.projectedMonthlyRevenue.toFixed(0)} € previstos`, tone: "neutral" as const },
          },
          {
            href: "/admin/financeiro",
            icon: <TrendingUp size={24} aria-hidden />,
            value: `${Math.max(0, stats.projectedMonthlyRevenue - stats.receivedThisMonth).toFixed(0)} €`,
            label: "Falta receber",
            info: "Receita prevista do mês menos o que já foi pago das mensalidades deste mês.",
          },
          {
            href: "/admin/alunos",
            icon: <DoorOpen size={24} aria-hidden />,
            value: String(trends.churnThisMonth),
            label: "Saídas este mês",
            info: "Alunos que passaram a INATIVO, ou ficaram INADIMPLENTES sem plano, este mês. A percentagem é sobre os ativos no fim do mês anterior.",
            trend: deltaTrend(trends.churnThisMonth - trends.churnLastMonth, false, ` · ${fmt(trends.churnRatePct)}%`),
          },
          {
            href: "/admin/presenca",
            icon: <CalendarCheck size={24} aria-hidden />,
            value: fmt(trends.trainingsPerStudentWeek),
            label: "Treinos por aluno / semana",
            info: "Presenças confirmadas nas últimas 4 semanas ÷ alunos ativos ÷ 4. A comparação é com as 4 semanas anteriores.",
            trend: deltaTrend(Math.round((trends.trainingsPerStudentWeek - trends.trainingsPerStudentWeekPrev) * 10) / 10, true),
          },
        ]}
      />
    </>
  );
}
