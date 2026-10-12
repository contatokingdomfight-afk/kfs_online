import "server-only";

import {
  Activity,
  Banknote,
  Bell,
  Book,
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Dumbbell,
  FlaskConical,
  Gauge,
  GraduationCap,
  Home,
  LineChart,
  ListChecks,
  Medal,
  Scale,
  Settings,
  Shield,
  Sparkles,
  Timer,
  UserRound,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import type { SidebarLink } from "@/components/Sidebar";
import type { MobileAppBottomNavConfig, MobileAppBottomNavItem, MobileNavIconId } from "@/components/MobileAppBottomNav";
import type { MessageKey } from "@/lib/i18n";
import type { ResolvedAdminAccess } from "@/lib/permissions/resolve";
import { canAccessAdminPathname } from "@/lib/permissions/paths";

type TFn = (key: MessageKey) => string;

const I = 18;

/**
 * Menu do professor em áreas: Hoje · Aulas · Alunos · Conteúdo + Conta (como a área do aluno).
 * A mesma lista alimenta o menu lateral, a barra inferior e as páginas /coach/area/….
 *
 * Ficheiro `.tsx` (não `.ts`): os ícones têm de ser resolvidos aqui, em JSX — ver nota em
 * lib/admin-nav-areas.tsx sobre a fronteira Server → Client com `<ResponsiveShell>`.
 */
export type CoachAreaId = "hoje" | "aulas" | "alunos" | "conteudo" | "conta";
export type CoachNavItem = { label: string; href: string; icon: ReactNode; hint?: string; groupActiveHrefs?: string[] };
export type CoachNavArea = { id: CoachAreaId; label: string; href: string; icon: ReactNode; mobileIcon: MobileNavIconId; items: CoachNavItem[] };

type Options = { showAdminEntry: boolean; coachStudentId: string | null; isSchoolAssistant?: boolean };

export function getCoachNavAreas(t: TFn, options: Options): CoachNavArea[] {
  const { showAdminEntry, coachStudentId, isSchoolAssistant } = options;
  const conta: CoachNavItem[] = [
    ...(isSchoolAssistant ? [] : [{ label: "Financeiro", href: "/coach/financeiro", icon: <Banknote size={I} aria-hidden />, hint: "Aulas dadas e pagamentos" }]),
    { label: t("navSettings"), href: "/coach/configuracoes", icon: <Settings size={I} aria-hidden /> },
    ...(coachStudentId || isSchoolAssistant ? [{ label: t("myStudentArea"), href: "/dashboard", icon: <GraduationCap size={I} aria-hidden />, hint: "Ver a app como aluno" }] : []),
    ...(showAdminEntry ? [{ label: "Admin", href: "/admin", icon: <Shield size={I} aria-hidden />, hint: "Backoffice da escola" }] : []),
  ];

  if (isSchoolAssistant) {
    // Assistente de escola: só marca presenças (ver isSchoolAssistantCoachPathAllowed).
    return [
      { id: "hoje", label: "Hoje", href: "/coach", icon: <Home size={I} aria-hidden />, mobileIcon: "home", items: [] },
      {
        id: "aulas",
        label: "Aulas",
        href: "/coach/area/aulas",
        icon: <CalendarCheck size={I} aria-hidden />,
        mobileIcon: "calendar",
        items: [
          { label: t("navManageClasses"), href: "/coach/aula", icon: <CalendarCheck size={I} aria-hidden />, hint: "Presenças e check-in" },
          { label: t("navAgenda"), href: "/coach/agenda", icon: <Calendar size={I} aria-hidden /> },
          { label: t("navEventsSchoolCheckIn"), href: "/coach/eventos", icon: <Sparkles size={I} aria-hidden /> },
          { label: "Arbitragem", href: "/coach/arbitragem", icon: <Scale size={I} aria-hidden /> },
        ],
      },
      { id: "conta", label: "Conta", href: "/coach/area/conta", icon: <UserRound size={I} aria-hidden />, mobileIcon: "user", items: conta },
    ];
  }

  return [
    { id: "hoje", label: "Hoje", href: "/coach", icon: <Home size={I} aria-hidden />, mobileIcon: "home", items: [{ label: "Notificações", href: "/coach/notificacoes", icon: <Bell size={I} aria-hidden /> }] },
    {
      id: "aulas",
      label: "Aulas",
      href: "/coach/area/aulas",
      icon: <CalendarCheck size={I} aria-hidden />,
      mobileIcon: "calendar",
      items: [
        { label: t("navManageClasses"), href: "/coach/aula", icon: <CalendarCheck size={I} aria-hidden />, hint: "Presenças, check-in e esforço" },
        { label: t("navAgenda"), href: "/coach/agenda", icon: <Calendar size={I} aria-hidden />, hint: "Horário da semana" },
        { label: t("navRoundTimer"), href: "/coach/round-timer", icon: <Timer size={I} aria-hidden />, hint: "Rounds e descanso" },
        { label: "Exames de graduação", href: "/coach/graduacao", icon: <Medal size={I} aria-hidden />, hint: "Convocar e avaliar" },
        { label: t("navEvents"), href: "/coach/eventos", icon: <Sparkles size={I} aria-hidden /> },
        { label: "Arbitragem", href: "/coach/arbitragem", icon: <Scale size={I} aria-hidden /> },
      ],
    },
    {
      id: "alunos",
      label: "Alunos",
      href: "/coach/area/alunos",
      icon: <Users size={I} aria-hidden />,
      mobileIcon: "users",
      items: [
        { label: t("navStudents"), href: "/coach/alunos", icon: <GraduationCap size={I} aria-hidden />, hint: "Fichas e avaliações" },
        { label: t("navAthletesCoach"), href: "/coach/atletas", icon: <Dumbbell size={I} aria-hidden /> },
        { label: "Carga de treino", href: "/coach/carga", icon: <Activity size={I} aria-hidden />, hint: "Quem está a treinar demais ou de menos" },
        { label: t("navTrials"), href: "/coach/experimentais", icon: <FlaskConical size={I} aria-hidden /> },
        { label: "Cobertura de avaliações", href: "/coach/cobertura-avaliacoes", icon: <ListChecks size={I} aria-hidden />, hint: "Quem falta avaliar" },
        { label: t("navModalityInsights"), href: "/coach/desempenho-modalidades", icon: <LineChart size={I} aria-hidden /> },
        { label: t("navEvaluationDocs"), href: "/como-sou-avaliado", icon: <Gauge size={I} aria-hidden />, groupActiveHrefs: ["/como-sou-avaliado", "/sistema-pontuacao"] },
      ],
    },
    {
      id: "conteudo",
      label: "Conteúdo",
      href: "/coach/area/conteudo",
      icon: <BookOpen size={I} aria-hidden />,
      mobileIcon: "book",
      items: [
        { label: t("navWeekTheme"), href: "/coach/tema-semana", icon: <CalendarDays size={I} aria-hidden /> },
        { label: t("navWeekThemeMonthly"), href: "/coach/tema-semana/mensal", icon: <CalendarRange size={I} aria-hidden /> },
        { label: "Meus cursos", href: "/coach/cursos", icon: <Book size={I} aria-hidden /> },
        { label: t("libraryTitle"), href: "/coach/biblioteca", icon: <BookOpen size={I} aria-hidden /> },
      ],
    },
    { id: "conta", label: "Conta", href: "/coach/area/conta", icon: <UserRound size={I} aria-hidden />, mobileIcon: "user", items: conta },
  ];
}

/** Só o que o utilizador pode abrir (admins com permissões granulares). */
export function filterCoachNavAreas(areas: CoachNavArea[], access: ResolvedAdminAccess | null): CoachNavArea[] {
  if (!access || access.kind !== "granted") return areas;
  return areas
    .map((a) => ({ ...a, items: a.items.filter((i) => i.href === "/dashboard" || i.href === "/admin" || canAccessAdminPathname(access, i.href)) }))
    .filter((a) => a.id === "hoje" || a.items.length > 0);
}

/** Barra lateral do professor: uma entrada por área; os atalhos só abrem na área ativa. */
export function getCoachShellSidebarLinks(t: TFn, options: Options, access: ResolvedAdminAccess | null = null): SidebarLink[] {
  return filterCoachNavAreas(getCoachNavAreas(t, options), access).map((a) => ({
    label: a.label,
    href: a.href,
    icon: a.icon,
    collapseChildren: true,
    exactMatch: a.id === "hoje",
    children: a.items.length ? a.items.map((i) => ({ label: i.label, href: i.href, groupActiveHrefs: i.groupActiveHrefs })) : undefined,
  }));
}

/** Telemóvel: Hoje · Aulas · Alunos · Conteúdo + «Conta» (painel com os atalhos, tema e sair). */
export function getCoachMobileBottomNav(t: TFn, options: Options, access: ResolvedAdminAccess | null = null): MobileAppBottomNavConfig {
  const areas = filterCoachNavAreas(getCoachNavAreas(t, options), access);
  const conta = areas.find((a) => a.id === "conta");
  const main = areas.filter((a) => a.id !== "conta");
  const primary: MobileAppBottomNavItem[] = main.map((a) => ({
    label: a.label,
    href: a.href,
    icon: a.mobileIcon,
    exactHref: a.id === "hoje",
    groupActiveHrefs: [a.href, ...a.items.flatMap((i) => i.groupActiveHrefs ?? [i.href])].filter((h) => h !== "/coach"),
  }));
  // A barra precisa de 4 entradas (ex.: assistente só tem Hoje e Aulas): completa com atalhos das aulas.
  const extra = (main.find((a) => a.id === "aulas")?.items ?? []).filter((i) => !primary.some((p) => p.href === i.href));
  while (primary.length < 4 && extra.length) {
    const i = extra.shift()!;
    primary.push({ label: i.label, href: i.href, icon: "calendar" });
  }
  return {
    primary: primary.slice(0, 4) as MobileAppBottomNavConfig["primary"],
    overflow: (conta?.items ?? []).map((i) => ({ label: i.label, href: i.href, icon: i.href === "/admin" ? "gear" : i.href === "/dashboard" ? "user" : i.href.includes("financeiro") ? "credit" : "gear" })),
    moreLabel: conta?.label ?? "Conta",
    moreIcon: "user",
  };
}
