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
import { getStudentNavAreas, studentNavAreaHrefs, type StudentNavArea } from "@/lib/dashboard-student-nav";
import type { MessageKey } from "@/lib/i18n";

function iconForStudentNavHref(href: string): MobileNavIconId {
  if (href.includes("replayOnboarding=1")) return "star";
  if (href.startsWith("/dashboard/bem-estar")) return "heart";
  if (href.startsWith("/dashboard/treino/carga")) return "chart";
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
  if (href.startsWith("/dashboard/documentos-adesao")) return "file";
  if (href.startsWith("/dashboard/notificacoes")) return "flag";
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
 * Barra inferior do aluno (mobile): as 4 áreas fixas (Hoje, Evolução, Treino, Tribo) e,
 * no lugar de «Mais», a «Conta» com perfil, ficha física, financeiro, etc.
 */
export function buildStudentMobileBottomNav(areas: StudentNavArea[]): MobileAppBottomNavConfig {
  const main = areas.filter((a) => a.id !== "conta").slice(0, 4);
  const conta = areas.find((a) => a.id === "conta");

  const primary = main.map<MobileAppBottomNavItem>((a) => {
    const group = studentNavAreaHrefs(a);
    return {
      label: a.label,
      href: a.href,
      icon: a.icon,
      prefetch: a.prefetch,
      // «Hoje» (/dashboard) é activo só na própria página; as outras áreas incluem as sub-páginas.
      groupActiveHrefs: a.href === "/dashboard" || group.length === 0 ? undefined : group,
    };
  });

  return {
    primary: primary as MobileAppBottomNavConfig["primary"],
    overflow: (conta?.children ?? []).map(toMobileItem),
    moreLabel: conta?.label ?? "Conta",
    moreIcon: "user",
    // «Conta» abre a página da conta (com tema, idioma e sair) em vez do sheet.
    moreHref: conta?.href,
  };
}

/** Barra inferior do aluno (mobile), com base no plano — para layouts fora de `/dashboard`. */
export async function getStudentMobileBottomNavConfig(locale: "pt" | "en", t: (key: MessageKey) => string): Promise<MobileAppBottomNavConfig> {
  const areas = await getStudentNavAreasForCurrentUser(locale, t);
  return buildStudentMobileBottomNav(areas);
}

/** Áreas de navegação do aluno autenticado (plano, acessos e assistente resolvidos aqui). */
export async function getStudentNavAreasForCurrentUser(
  locale: "pt" | "en",
  t: (key: MessageKey) => string
): Promise<StudentNavArea[]> {
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
  const { count: familyCount } = studentId
    ? await supabase.from("FamilyGroupMember").select("id", { count: "exact", head: true }).eq("studentId", studentId)
    : { count: 0 };
  return getStudentNavAreas({
    t,
    locale,
    planAccess,
    hasPlan,
    hasSchoolAssistantCoach: Boolean(schoolAssistant),
    hasFamily: (familyCount ?? 0) > 0,
  });
}
