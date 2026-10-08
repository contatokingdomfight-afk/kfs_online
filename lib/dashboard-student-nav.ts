import type { MobileNavIconId } from "@/components/MobileAppBottomNav";
import type { MessageKey } from "@/lib/i18n";
import type { PlanAccess } from "@/lib/plan-access";
import type { DashboardNavLinkInput } from "@/lib/dashboard-student-base-links";

type TFn = (key: MessageKey) => string;

export type StudentNavAreaId = "hoje" | "evolucao" | "treino" | "tribo" | "plano" | "conta";

/** Uma das áreas principais da navegação do aluno (barra lateral + barra inferior). */
export type StudentNavArea = {
  id: StudentNavAreaId;
  label: string;
  href: string;
  icon: MobileNavIconId;
  prefetch?: boolean;
  /** Sub-páginas da área; na barra lateral só aparecem quando a área está activa. */
  children: DashboardNavLinkInput[];
};

export type StudentNavParams = {
  t: TFn;
  locale: "pt" | "en";
  planAccess: PlanAccess;
  hasPlan: boolean;
  /** Treinador assistente: atalho para presenças na escola. */
  hasSchoolAssistantCoach?: boolean;
};

/**
 * Navegação do aluno em 4 áreas (Hoje, Evolução, Treino, Tribo) + Conta.
 * Fonte única para a barra lateral (desktop), a barra inferior (mobile) e os layouts de documentação.
 */
export function getStudentNavAreas(params: StudentNavParams): StudentNavArea[] {
  const { t, locale, planAccess, hasPlan, hasSchoolAssistantCoach } = params;
  const pt = locale === "pt";

  const conta: StudentNavArea = {
    id: "conta",
    label: pt ? "Conta" : "Account",
    href: "/dashboard/perfil",
    icon: "user",
    children: [
      { label: t("navProfile"), href: "/dashboard/perfil" },
      { label: t("navPhysicalFicha"), href: "/dashboard/ficha-fisica" },
      ...(hasPlan
        ? [
            { label: pt ? "Plano e pagamentos" : "Plan & payments", href: "/dashboard/financeiro" },
            { label: pt ? "Documentos de adesão" : "Membership documents", href: "/dashboard/documentos-adesao" },
          ]
        : []),
      { label: pt ? "Notificações" : "Notifications", href: "/dashboard/notificacoes" },
      ...(hasSchoolAssistantCoach
        ? [{ label: pt ? "Assistente (presenças na escola)" : "Assistant (school check-in)", href: "/coach" }]
        : []),
      ...(hasPlan ? [{ label: t("onboardingReplayTour"), href: "/dashboard?replayOnboarding=1" }] : []),
    ],
  };

  const treino: StudentNavArea = {
    id: "treino",
    label: pt ? "Treino" : "Training",
    href: "/dashboard/bem-estar",
    icon: "dumbbell",
    children: [
      { label: pt ? "Bem-estar e treino" : "Wellness & training", href: "/dashboard/bem-estar" },
      { label: t("navLibrary"), href: "/dashboard/biblioteca" },
      ...(hasPlan ? [{ label: pt ? "Tema da semana" : "Theme of the week", href: "/dashboard/tema-semana" }] : []),
    ],
  };

  if (!hasPlan) {
    return [
      { id: "hoje", label: pt ? "Hoje" : "Today", href: "/dashboard", icon: "home", children: [] },
      treino,
      { id: "plano", label: t("choosePlanShortTitle"), href: "/escolher-plano", icon: "sparkles", children: [] },
      conta,
    ];
  }

  const evolucaoChildren: DashboardNavLinkInput[] = [
    ...(planAccess.hasPerformanceTracking
      ? [
          { label: t("navAthleteProfile"), href: "/dashboard/performance" },
          { label: pt ? "A minha graduação" : "My graduation", href: "/dashboard/graduacao" },
          { label: pt ? "Avaliações" : "Evaluations", href: "/dashboard/performance/historico" },
          { label: t("navConquests"), href: "/dashboard/conquistas" },
          { label: t("navRank"), href: "/dashboard/rank" },
        ]
      : []),
    ...(planAccess.hasCheckIn ? [{ label: t("navHistoricoPresencas"), href: "/dashboard/historico" }] : []),
    {
      label: pt ? "Como sou avaliado" : "How I'm evaluated",
      href: "/como-sou-avaliado",
      prefetch: false,
      groupActiveHrefs: ["/como-sou-avaliado", "/sistema-pontuacao"],
    },
  ];

  return [
    { id: "hoje", label: pt ? "Hoje" : "Today", href: "/dashboard", icon: "home", children: [] },
    {
      id: "evolucao",
      label: pt ? "Evolução" : "Progress",
      href: "/dashboard/evolucao",
      icon: "chart",
      children: evolucaoChildren,
    },
    treino,
    {
      id: "tribo",
      label: t("navTribe"),
      href: "/dashboard/tribo",
      icon: "users",
      children: [
        { label: t("navTribe"), href: "/dashboard/tribo" },
        { label: t("navEvents"), href: "/dashboard/eventos" },
        { label: t("navStore"), href: "/dashboard/loja" },
        ...(planAccess.hasExclusiveBenefits
          ? [{ label: t("navExclusiveBenefits"), href: "/dashboard/beneficios" }]
          : []),
      ],
    },
    conta,
  ];
}

/** Todos os destinos de uma área (a própria + filhos), para marcar a área como activa. */
export function studentNavAreaHrefs(area: StudentNavArea): string[] {
  const hrefs = new Set<string>();
  const add = (href: string) => {
    const [path] = href.split("?");
    if (path !== "/dashboard") hrefs.add(path);
  };
  add(area.href);
  for (const c of area.children) {
    if (c.groupActiveHrefs?.length) c.groupActiveHrefs.forEach(add);
    else add(c.href);
  }
  return [...hrefs];
}
