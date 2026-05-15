import type { SidebarLink } from "@/components/Sidebar";
import type { MessageKey } from "@/lib/i18n";

type TFn = (key: MessageKey) => string;

/** Barra lateral mínima quando o aluno (ou admin em «ver como aluno») está nas páginas de documentação de avaliação. */
export function getEvaluationDocsStudentShellLinks(t: TFn): SidebarLink[] {
  return [
    { label: t("navHome"), href: "/dashboard" },
    { label: t("navAthleteProfile"), href: "/dashboard/performance" },
    { label: "Histórico de avaliações", href: "/dashboard/performance/historico" },
    {
      label: t("navEvaluationDocs"),
      href: "/como-sou-avaliado",
      prefetch: false,
      groupActiveHrefs: ["/como-sou-avaliado", "/sistema-pontuacao"],
    },
    { label: t("navConquests"), href: "/dashboard/conquistas" },
    { label: t("navStore"), href: "/dashboard/loja" },
    { label: t("navLibrary"), href: "/dashboard/biblioteca" },
    { label: t("navEvents"), href: "/dashboard/eventos" },
    { label: t("navFinance"), href: "/dashboard/financeiro" },
    { label: t("navProfile"), href: "/dashboard/perfil" },
    { label: t("onboardingReplayTour"), href: "/dashboard?replayOnboarding=1" },
  ];
}
