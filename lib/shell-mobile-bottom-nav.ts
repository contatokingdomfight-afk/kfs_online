import type { SidebarLink } from "@/components/Sidebar";
import type { MobileAppBottomNavConfig, MobileAppBottomNavItem, MobileNavIconId } from "@/components/MobileAppBottomNav";
import type { DashboardNavLinkInput } from "@/lib/dashboard-student-base-links";

/** Converte links do sidebar (com filhos) numa lista plana para a barra inferior. */
export function flattenSidebarLinks(links: SidebarLink[]): DashboardNavLinkInput[] {
  const out: DashboardNavLinkInput[] = [];
  for (const item of links) {
    out.push({
      label: item.label,
      href: item.href,
      prefetch: item.prefetch,
      groupActiveHrefs: item.groupActiveHrefs,
    });
    for (const child of item.children ?? []) {
      const group = [...new Set([...(item.groupActiveHrefs ?? []), item.href, child.href])];
      out.push({
        label: child.label,
        href: child.href,
        prefetch: child.prefetch,
        groupActiveHrefs: group,
      });
    }
  }
  return out;
}

export function dedupeSidebarFlatLinks(links: DashboardNavLinkInput[]): DashboardNavLinkInput[] {
  const seen = new Set<string>();
  const out: DashboardNavLinkInput[] = [];
  for (const l of links) {
    if (seen.has(l.href)) continue;
    seen.add(l.href);
    out.push(l);
  }
  return out;
}

const COACH_PRIMARY_HREFS = ["/coach", "/coach/agenda", "/coach/alunos", "/coach/aula"] as const;
const ADMIN_PRIMARY_HREFS = ["/admin", "/admin/alunos", "/admin/turmas", "/admin/financeiro"] as const;

export function iconForCoachOrAdminHref(href: string): MobileNavIconId {
  if (href === "/coach" || href === "/admin") return "home";
  if (href.startsWith("/coach/agenda") || href.startsWith("/admin/eventos")) return "calendar";
  if (href.includes("/alunos")) return "users";
  if (href.includes("/atletas")) return "user";
  if (href.includes("/turmas")) return "layers";
  if (href.includes("/financeiro")) return "credit";
  if (href.includes("/escolas")) return "building";
  if (href.includes("/coaches")) return "users";
  if (href.includes("/experimentais")) return "star";
  if (href.includes("/leads")) return "flag";
  if (href.includes("/modalidades")) return "chart";
  if (href.includes("/locais")) return "building";
  if (href.includes("/planos")) return "credit";
  if (href.includes("/cursos")) return "book";
  if (href.includes("/missoes")) return "flag";
  if (href.includes("/permissoes")) return "gear";
  if (href.includes("/configuracoes")) return "gear";
  if (href.startsWith("/como-sou-avaliado") || href.startsWith("/sistema-pontuacao")) return "scale";
  if (href.includes("/avaliacao") || href.includes("/componentes-gerais")) return "file";
  if (href.includes("/aula")) return "chart";
  if (href.includes("/tema-semana")) return "star";
  if (href.includes("/biblioteca")) return "book";
  if (href === "/dashboard") return "home";
  return "star";
}

function toBottomItem(link: DashboardNavLinkInput): MobileAppBottomNavItem {
  return {
    label: link.label,
    href: link.href,
    icon: iconForCoachOrAdminHref(link.href),
    prefetch: link.prefetch,
    groupActiveHrefs: link.groupActiveHrefs,
  };
}

/**
 * Quatro atalhos + «Mais» a partir do menu lateral (Coach ou Admin), respeitando a ordem preferida e o que existir após filtros de permissão.
 */
export function buildShellMobileBottomNav(
  role: "coach" | "admin",
  flatLinks: DashboardNavLinkInput[],
  moreLabel: string
): MobileAppBottomNavConfig {
  const flat = dedupeSidebarFlatLinks(flatLinks);
  const preferred = role === "coach" ? COACH_PRIMARY_HREFS : ADMIN_PRIMARY_HREFS;
  const used = new Set<string>();
  const primary: MobileAppBottomNavItem[] = [];

  for (const href of preferred) {
    const link = flat.find((l) => l.href === href);
    if (link && primary.length < 4) {
      primary.push(toBottomItem(link));
      used.add(link.href);
    }
  }
  for (const link of flat) {
    if (primary.length >= 4) break;
    if (used.has(link.href)) continue;
    primary.push(toBottomItem(link));
    used.add(link.href);
  }

  const overflow = flat.filter((l) => !used.has(l.href)).map((l) => toBottomItem(l));

  return {
    primary: primary as MobileAppBottomNavConfig["primary"],
    overflow,
    moreLabel,
  };
}
