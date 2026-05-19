import type { MessageKey } from "@/lib/i18n";
import type { PlanAccess } from "@/lib/plan-access";

export type DashboardNavLinkInput = {
  label: string;
  href: string;
  prefetch?: boolean;
  groupActiveHrefs?: string[];
};

type TFn = (key: MessageKey) => string;

/** Links laterais do aluno (mesma lista para /dashboard e para montar a barra inferior). */
export function getDashboardStudentBaseLinks(params: {
  t: TFn;
  locale: "pt" | "en";
  planAccess: PlanAccess;
  hasPlan: boolean;
  /** Treinador assistente: atalho para presenças na escola. */
  hasSchoolAssistantCoach?: boolean;
}): DashboardNavLinkInput[] {
  const { t, locale, planAccess, hasPlan, hasSchoolAssistantCoach } = params;
  const bemEstarLabel = locale === "pt" ? "Bem-estar e treino" : "Wellness & training";
  const assistantLabel = locale === "pt" ? "Assistente (presenças na escola)" : "Assistant (school check-in)";

  if (hasPlan) {
    return [
      { label: t("navHome"), href: "/dashboard" },
      ...(hasSchoolAssistantCoach ? [{ label: assistantLabel, href: "/coach" }] : []),
      { label: bemEstarLabel, href: "/dashboard/bem-estar" },
      ...(planAccess.hasPerformanceTracking
        ? [
            { label: t("navAthleteProfile"), href: "/dashboard/performance" },
            { label: "Histórico de avaliações", href: "/dashboard/performance/historico" },
          ]
        : []),
      {
        label: t("navEvaluationDocs"),
        href: "/como-sou-avaliado",
        prefetch: false,
        groupActiveHrefs: ["/como-sou-avaliado", "/sistema-pontuacao"],
      },
      ...(planAccess.hasPerformanceTracking ? [{ label: t("navConquests"), href: "/dashboard/conquistas" }] : []),
      ...(planAccess.hasPerformanceTracking ? [{ label: t("navRank"), href: "/dashboard/rank" }] : []),
      ...(planAccess.hasCheckIn ? [{ label: t("navHistoricoPresencas"), href: "/dashboard/historico" }] : []),
      { label: t("navStore"), href: "/dashboard/loja" },
      { label: t("navLibrary"), href: "/dashboard/biblioteca" },
      { label: t("navEvents"), href: "/dashboard/eventos" },
      { label: t("navTribe"), href: "/dashboard/tribo" },
      { label: t("navFinance"), href: "/dashboard/financeiro" },
      { label: t("navProfile"), href: "/dashboard/perfil" },
      { label: t("navPhysicalFicha"), href: "/dashboard/ficha-fisica" },
      ...(planAccess.hasExclusiveBenefits ? [{ label: t("navExclusiveBenefits"), href: "/dashboard/beneficios" }] : []),
      { label: t("onboardingReplayTour"), href: "/dashboard?replayOnboarding=1" },
    ];
  }

  return [
    { label: t("navHome"), href: "/dashboard" },
    ...(hasSchoolAssistantCoach ? [{ label: assistantLabel, href: "/coach" }] : []),
    { label: bemEstarLabel, href: "/dashboard/bem-estar" },
    { label: "✨ " + t("choosePlanTitle"), href: "/escolher-plano" },
    { label: t("navLibrary"), href: "/dashboard/biblioteca" },
    { label: t("navProfile"), href: "/dashboard/perfil" },
    { label: t("navPhysicalFicha"), href: "/dashboard/ficha-fisica" },
  ];
}
