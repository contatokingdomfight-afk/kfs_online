import type {
  MobileAppBottomNavConfig,
  MobileAppBottomNavItem,
  MobileNavIconId,
} from "@/components/MobileAppBottomNav";
import type { DashboardNavLinkInput } from "@/lib/dashboard-student-base-links";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";
import { getCachedPlanAccess } from "@/lib/plan-access";
import { createClient } from "@/lib/supabase/server";
import { getDashboardStudentBaseLinks } from "@/lib/dashboard-student-base-links";
import type { MessageKey } from "@/lib/i18n";

function iconForStudentNavHref(href: string): MobileNavIconId {
  if (href.includes("replayOnboarding=1")) return "star";
  if (href.startsWith("/dashboard/bem-estar")) return "heart";
  if (href.startsWith("/dashboard/performance/historico")) return "file";
  if (href.startsWith("/dashboard/performance")) return "chart";
  if (href.startsWith("/como-sou-avaliado") || href.startsWith("/sistema-pontuacao")) return "scale";
  if (href.startsWith("/dashboard/conquistas")) return "trophy";
  if (href.startsWith("/dashboard/rank")) return "medal";
  if (href.startsWith("/dashboard/historico")) return "clock";
  if (href.startsWith("/dashboard/loja")) return "shopping";
  if (href.startsWith("/dashboard/biblioteca")) return "book";
  if (href.startsWith("/dashboard/eventos")) return "calendar";
  if (href.startsWith("/dashboard/tribo")) return "users";
  if (href.startsWith("/dashboard/financeiro")) return "credit";
  if (href.startsWith("/dashboard/perfil")) return "user";
  if (href.startsWith("/dashboard/ficha-fisica")) return "file";
  if (href.startsWith("/dashboard/beneficios")) return "star";
  if (href.startsWith("/escolher-plano")) return "sparkles";
  if (href.startsWith("/coach")) return "calendar";
  if (href === "/dashboard") return "home";
  return "star";
}

function toMobileItem(link: DashboardNavLinkInput): MobileAppBottomNavItem {
  return {
    label: link.label,
    href: link.href,
    icon: iconForStudentNavHref(link.href),
    prefetch: link.prefetch,
    groupActiveHrefs: link.groupActiveHrefs,
  };
}

/**
 * Quatro atalhos na barra + "Mais" com o restante do menu do aluno (mobile).
 * Com plano: Início, Perfil de atleta (ou Biblioteca), Tribo, Eventos — Bem-estar e o resto em «Mais».
 */
export function buildStudentMobileBottomNav(
  baseLinks: DashboardNavLinkInput[],
  opts: {
    hasPlan: boolean;
    hasPerformanceTracking: boolean;
    moreLabel: string;
    wellnessLabel: string;
    navHome: string;
    navEvents: string;
    navTribe: string;
    navAthleteProfile: string;
    navLibrary: string;
    choosePlanLabel: string;
  }
): MobileAppBottomNavConfig {
  const primaryHrefSet = new Set<string>();

  let primary: MobileAppBottomNavItem[];

  if (opts.hasPlan) {
    const slot2: MobileAppBottomNavItem = opts.hasPerformanceTracking
      ? { label: opts.navAthleteProfile, href: "/dashboard/performance", icon: "chart" }
      : { label: opts.navLibrary, href: "/dashboard/biblioteca", icon: "book" };

    primary = [
      { label: opts.navHome, href: "/dashboard", icon: "home" },
      slot2,
      { label: opts.navTribe, href: "/dashboard/tribo", icon: "users" },
      { label: opts.navEvents, href: "/dashboard/eventos", icon: "calendar" },
    ];
  } else {
    primary = [
      { label: opts.navHome, href: "/dashboard", icon: "home" },
      { label: opts.wellnessLabel, href: "/dashboard/bem-estar", icon: "heart" },
      { label: opts.choosePlanLabel, href: "/escolher-plano", icon: "sparkles" },
      { label: opts.navLibrary, href: "/dashboard/biblioteca", icon: "book" },
    ];
  }

  for (const p of primary) primaryHrefSet.add(p.href);

  const overflow: MobileAppBottomNavItem[] = [];
  for (const link of baseLinks) {
    if (primaryHrefSet.has(link.href)) continue;
    overflow.push(toMobileItem(link));
  }

  return {
    primary: primary as MobileAppBottomNavConfig["primary"],
    overflow,
    moreLabel: opts.moreLabel,
  };
}

/** Barra inferior do aluno (mobile), com base no plano — para layouts fora de `/dashboard`. */
export async function getStudentMobileBottomNavConfig(locale: "pt" | "en", t: (key: MessageKey) => string): Promise<MobileAppBottomNavConfig> {
  const studentId = await getCurrentStudentId();
  const [planAccess, supabase, dbUser] = await Promise.all([
    getCachedPlanAccess(studentId),
    createClient(),
    getCurrentDbUser(),
  ]);
  const studentRes = studentId
    ? await supabase.from("Student").select("planId").eq("id", studentId).single()
    : { data: null };
  const hasPlan = !!studentRes.data?.planId;
  const schoolAssistant =
    dbUser?.role === "ALUNO" ? await getActiveSchoolAssistantForUserId(supabase, dbUser.id) : null;
  const baseLinks = getDashboardStudentBaseLinks({
    t,
    locale,
    planAccess,
    hasPlan,
    hasSchoolAssistantCoach: Boolean(schoolAssistant),
  });
  return buildStudentMobileBottomNav(baseLinks, {
    hasPlan,
    hasPerformanceTracking: planAccess.hasPerformanceTracking,
    moreLabel: locale === "pt" ? "Mais" : "More",
    wellnessLabel: locale === "pt" ? "Bem-Estar" : "Wellness",
    navHome: t("navHome"),
    navEvents: t("navEvents"),
    navTribe: t("navTribe"),
    navAthleteProfile: t("navAthleteProfile"),
    navLibrary: t("navLibrary"),
    choosePlanLabel: "✨ " + t("choosePlanTitle"),
  });
}
