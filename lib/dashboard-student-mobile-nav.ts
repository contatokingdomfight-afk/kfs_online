import type {
  MobileAppBottomNavConfig,
  MobileAppBottomNavItem,
  MobileNavIconId,
} from "@/components/MobileAppBottomNav";

export type DashboardNavLinkInput = {
  label: string;
  href: string;
  prefetch?: boolean;
  groupActiveHrefs?: string[];
};

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
  if (href.startsWith("/dashboard/financeiro")) return "credit";
  if (href.startsWith("/dashboard/perfil")) return "user";
  if (href.startsWith("/dashboard/ficha-fisica")) return "file";
  if (href.startsWith("/dashboard/beneficios")) return "star";
  if (href.startsWith("/escolher-plano")) return "sparkles";
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
    navAthleteProfile: string;
    navLibrary: string;
    choosePlanLabel: string;
  }
): MobileAppBottomNavConfig {
  const primaryHrefSet = new Set<string>();

  let primary: MobileAppBottomNavItem[];

  if (opts.hasPlan) {
    const slot3: MobileAppBottomNavItem = opts.hasPerformanceTracking
      ? { label: opts.navAthleteProfile, href: "/dashboard/performance", icon: "chart" }
      : { label: opts.navLibrary, href: "/dashboard/biblioteca", icon: "book" };

    primary = [
      { label: opts.navHome, href: "/dashboard", icon: "home" },
      { label: opts.wellnessLabel, href: "/dashboard/bem-estar", icon: "heart" },
      slot3,
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
