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

const ICON_SIZE = 18;

/**
 * Menu lateral do backoffice — usar apenas quando `getCurrentDbUser().role === "ADMIN"`.
 * Não incluir em layouts de aluno ou coach.
 *
 * Ficheiro `.tsx` (não `.ts`): os ícones têm de ser resolvidos aqui, em JSX, porque este
 * resultado atravessa a fronteira Server → Client ao ser passado para `<ResponsiveShell>`
 * ("use client"). Passar a referência do componente (ex.: `icon: Home`) em vez do elemento já
 * construído (`icon: <Home />`) parte o render em produção — React Flight não sabe serializar
 * um tipo de componente como prop de um Client Component.
 */
export function getAdminBackofficeSidebarLinks(t: (key: MessageKey) => string): SidebarLink[] {
  return [
    { label: t("navHome"), href: "/admin", icon: <Home size={ICON_SIZE} aria-hidden /> },
    { label: t("navDashboard"), href: "/admin/dashboard", icon: <LayoutDashboard size={ICON_SIZE} aria-hidden />, section: t("adminGroupShortcuts") },
    { label: t("navStudents"), href: "/admin/alunos", icon: <GraduationCap size={ICON_SIZE} aria-hidden />, section: t("adminGroupPeople") },
    { label: t("navFamilies"), href: "/admin/familias", icon: <Users size={ICON_SIZE} aria-hidden />, section: t("adminGroupPeople") },
    { label: t("navAthletes"), href: "/admin/atletas", icon: <Dumbbell size={ICON_SIZE} aria-hidden />, section: t("adminGroupPeople") },
    { label: t("navCoaches"), href: "/admin/coaches", icon: <Whistle size={ICON_SIZE} aria-hidden />, section: t("adminGroupPeople") },
    { label: t("navTrials"), href: "/admin/experimentais", icon: <FlaskConical size={ICON_SIZE} aria-hidden />, section: t("adminGroupPeople") },
    { label: "Indicações", href: "/admin/indicacoes" as string, icon: <Handshake size={ICON_SIZE} aria-hidden />, section: t("adminGroupPeople") },
    { label: t("navSchools"), href: "/admin/escolas", icon: <School size={ICON_SIZE} aria-hidden />, section: t("adminGroupAcademic") },
    { label: t("navClasses"), href: "/admin/turmas", icon: <Layers size={ICON_SIZE} aria-hidden />, section: t("adminGroupAcademic") },
    { label: t("navPresence"), href: "/admin/presenca", icon: <CheckCircle2 size={ICON_SIZE} aria-hidden />, section: t("adminGroupAcademic") },
    { label: t("navModalities"), href: "/admin/modalidades", icon: <Swords size={ICON_SIZE} aria-hidden />, section: t("adminGroupAcademic") },
    { label: t("navLocations"), href: "/admin/locais", icon: <MapPin size={ICON_SIZE} aria-hidden />, section: t("adminGroupAcademic") },
    { label: "Adesões pendentes", href: "/admin/documentos-adesao" as string, icon: <FileText size={ICON_SIZE} aria-hidden />, section: t("adminGroupAcademic") },
    { label: "Arbitragem", href: "/coach/arbitragem", icon: <Scale size={ICON_SIZE} aria-hidden />, section: t("adminGroupAcademic") },
    { label: t("navPlans"), href: "/admin/planos", icon: <CreditCard size={ICON_SIZE} aria-hidden />, section: t("adminGroupContentFinance") },
    { label: t("navCourses"), href: "/admin/cursos", icon: <Book size={ICON_SIZE} aria-hidden />, section: t("adminGroupContentFinance") },
    { label: t("navWeekTheme"), href: "/admin/tema-semana", icon: <CalendarDays size={ICON_SIZE} aria-hidden />, section: t("adminGroupContentFinance") },
    { label: t("navEventsAdmin"), href: "/admin/eventos", icon: <Sparkles size={ICON_SIZE} aria-hidden />, section: t("adminGroupContentFinance") },
    { label: t("navFinance"), href: "/admin/financeiro", icon: <Banknote size={ICON_SIZE} aria-hidden />, section: t("adminGroupContentFinance") },
    { label: t("navLoja"), href: "/admin/loja", icon: <ShoppingBag size={ICON_SIZE} aria-hidden />, section: t("adminGroupContentFinance") },
    {
      label: t("navEvaluationDocs"),
      href: "/como-sou-avaliado",
      groupActiveHrefs: ["/como-sou-avaliado", "/sistema-pontuacao"],
      icon: <Gauge size={ICON_SIZE} aria-hidden />,
      section: t("adminGroupPlatform"),
    },
    {
      label: t("navEvaluationCriteria"),
      href: "/admin/avaliacao",
      icon: <ClipboardList size={ICON_SIZE} aria-hidden />,
      section: t("adminGroupPlatform"),
      children: [
        { label: t("navGeneralDimensions"), href: "/admin/componentes-gerais" },
        { label: t("navModalityInsights"), href: "/admin/desempenho-modalidades" },
      ],
    },
    { label: t("navMissions"), href: "/admin/missoes", icon: <Target size={ICON_SIZE} aria-hidden />, section: t("adminGroupPlatform") },
    { label: "Tribo", href: "/admin/tribo" as string, icon: <Megaphone size={ICON_SIZE} aria-hidden />, section: t("adminGroupPlatform") },
    { label: t("navGoals"), href: "/admin/metas", icon: <TrendingUp size={ICON_SIZE} aria-hidden />, section: t("adminGroupPlatform") },
    { label: t("navSettings"), href: "/admin/configuracoes", icon: <Settings size={ICON_SIZE} aria-hidden />, section: t("adminGroupPlatform") },
    { label: t("navPermissions"), href: "/admin/permissoes", icon: <Lock size={ICON_SIZE} aria-hidden />, section: t("adminGroupPlatform") },
  ];
}
