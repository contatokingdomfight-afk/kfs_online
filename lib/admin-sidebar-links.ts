import {
  Home,
  LayoutDashboard,
  GraduationCap,
  Users,
  Dumbbell,
  Whistle,
  FlaskConical,
  Handshake,
  School,
  Layers,
  CheckCircle2,
  Swords,
  MapPin,
  FileText,
  Scale,
  CreditCard,
  Book,
  CalendarDays,
  Sparkles,
  Banknote,
  ShoppingBag,
  Gauge,
  ClipboardList,
  Target,
  Megaphone,
  TrendingUp,
  Settings,
  Lock,
} from "lucide-react";
import type { SidebarLink } from "@/components/Sidebar";
import type { MessageKey } from "@/lib/i18n";

/**
 * Menu lateral do backoffice — usar apenas quando `getCurrentDbUser().role === "ADMIN"`.
 * Não incluir em layouts de aluno ou coach.
 */
export function getAdminBackofficeSidebarLinks(t: (key: MessageKey) => string): SidebarLink[] {
  return [
    { label: t("navHome"), href: "/admin", icon: Home },
    { label: t("navDashboard"), href: "/admin/dashboard", icon: LayoutDashboard, section: t("adminGroupShortcuts") },
    { label: t("navStudents"), href: "/admin/alunos", icon: GraduationCap, section: t("adminGroupPeople") },
    { label: t("navFamilies"), href: "/admin/familias", icon: Users, section: t("adminGroupPeople") },
    { label: t("navAthletes"), href: "/admin/atletas", icon: Dumbbell, section: t("adminGroupPeople") },
    { label: t("navCoaches"), href: "/admin/coaches", icon: Whistle, section: t("adminGroupPeople") },
    { label: t("navTrials"), href: "/admin/experimentais", icon: FlaskConical, section: t("adminGroupPeople") },
    { label: "Indicações", href: "/admin/indicacoes" as string, icon: Handshake, section: t("adminGroupPeople") },
    { label: t("navSchools"), href: "/admin/escolas", icon: School, section: t("adminGroupAcademic") },
    { label: t("navClasses"), href: "/admin/turmas", icon: Layers, section: t("adminGroupAcademic") },
    { label: t("navPresence"), href: "/admin/presenca", icon: CheckCircle2, section: t("adminGroupAcademic") },
    { label: t("navModalities"), href: "/admin/modalidades", icon: Swords, section: t("adminGroupAcademic") },
    { label: t("navLocations"), href: "/admin/locais", icon: MapPin, section: t("adminGroupAcademic") },
    { label: "Adesões pendentes", href: "/admin/documentos-adesao" as string, icon: FileText, section: t("adminGroupAcademic") },
    { label: "Arbitragem", href: "/coach/arbitragem", icon: Scale, section: t("adminGroupAcademic") },
    { label: t("navPlans"), href: "/admin/planos", icon: CreditCard, section: t("adminGroupContentFinance") },
    { label: t("navCourses"), href: "/admin/cursos", icon: Book, section: t("adminGroupContentFinance") },
    { label: t("navWeekTheme"), href: "/admin/tema-semana", icon: CalendarDays, section: t("adminGroupContentFinance") },
    { label: t("navEventsAdmin"), href: "/admin/eventos", icon: Sparkles, section: t("adminGroupContentFinance") },
    { label: t("navFinance"), href: "/admin/financeiro", icon: Banknote, section: t("adminGroupContentFinance") },
    { label: t("navLoja"), href: "/admin/loja", icon: ShoppingBag, section: t("adminGroupContentFinance") },
    {
      label: t("navEvaluationDocs"),
      href: "/como-sou-avaliado",
      groupActiveHrefs: ["/como-sou-avaliado", "/sistema-pontuacao"],
      icon: Gauge,
      section: t("adminGroupPlatform"),
    },
    {
      label: t("navEvaluationCriteria"),
      href: "/admin/avaliacao",
      icon: ClipboardList,
      section: t("adminGroupPlatform"),
      children: [
        { label: t("navGeneralDimensions"), href: "/admin/componentes-gerais" },
        { label: t("navModalityInsights"), href: "/admin/desempenho-modalidades" },
      ],
    },
    { label: t("navMissions"), href: "/admin/missoes", icon: Target, section: t("adminGroupPlatform") },
    { label: "Tribo", href: "/admin/tribo" as string, icon: Megaphone, section: t("adminGroupPlatform") },
    { label: t("navGoals"), href: "/admin/metas", icon: TrendingUp, section: t("adminGroupPlatform") },
    { label: t("navSettings"), href: "/admin/configuracoes", icon: Settings, section: t("adminGroupPlatform") },
    { label: t("navPermissions"), href: "/admin/permissoes", icon: Lock, section: t("adminGroupPlatform") },
  ];
}
