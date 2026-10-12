import "server-only";

import {
  Activity,
  BarChart3,
  Bell,
  Book,
  CalendarDays,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Dumbbell,
  FileText,
  FlaskConical,
  Gauge,
  GraduationCap,
  Handshake,
  Home,
  Layers,
  ListChecks,
  Lock,
  MapPin,
  Medal,
  Megaphone,
  Receipt,
  Scale,
  School,
  Settings,
  ShoppingBag,
  Sparkles,
  Swords,
  Tag,
  Target,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  Whistle,
} from "lucide-react";
import type { ReactNode } from "react";
import type { SidebarLink } from "@/components/Sidebar";
import type { MobileAppBottomNavConfig, MobileAppBottomNavItem, MobileNavIconId } from "@/components/MobileAppBottomNav";
import type { MessageKey } from "@/lib/i18n";
import type { ResolvedAdminAccess } from "@/lib/permissions/resolve";
import { canAccessAdminPathname } from "@/lib/permissions/paths";

/**
 * Menu do admin em 5 áreas (Hoje · Alunos · Aulas · Dinheiro · Configurar). Cada página do
 * backoffice está numa área; a mesma lista alimenta o menu lateral, a barra inferior no telemóvel,
 * as páginas de cada área (/admin/area/…) e a caixa «Procurar».
 *
 * Ficheiro `.tsx` (não `.ts`): os ícones têm de ser resolvidos aqui, em JSX, porque este resultado
 * atravessa a fronteira Server → Client ao ser passado para `<ResponsiveShell>` ("use client").
 * Passar a referência do componente (ex.: `icon: Home`) em vez do elemento já construído
 * (`icon: <Home />`) parte o render em produção — React Flight não sabe serializar um tipo de
 * componente como prop de um Client Component.
 */
export type AdminAreaId = "hoje" | "alunos" | "aulas" | "dinheiro" | "configurar";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  /** Frase curta na página da área. */
  hint?: string;
  /** Palavras extra para a caixa «Procurar» (ex.: «xp pontos»). */
  keywords?: string;
};

export type AdminNavArea = {
  id: AdminAreaId;
  label: string;
  href: string;
  icon: ReactNode;
  mobileIcon: MobileNavIconId;
  items: AdminNavItem[];
};

const I = 18;

export function getAdminNavAreas(t: (key: MessageKey) => string): AdminNavArea[] {
  return [
    {
      id: "hoje",
      label: "Hoje",
      href: "/admin",
      icon: <Home size={I} aria-hidden />,
      mobileIcon: "home",
      items: [
        { label: "A tratar hoje", href: "/admin/a-tratar", icon: <ListChecks size={I} aria-hidden />, hint: "Pagamentos, seguros, adesões e outros alertas", keywords: "alertas pendentes tarefas" },
        { label: "Relatórios", href: "/admin/dashboard", icon: <BarChart3 size={I} aria-hidden />, hint: "KPIs, alunos, dinheiro e treino", keywords: "dashboard estatisticas kpi graficos" },
        { label: "Notificações", href: "/admin/notificacoes", icon: <Bell size={I} aria-hidden />, keywords: "avisos mensagens" },
      ],
    },
    {
      id: "alunos",
      label: "Alunos",
      href: "/admin/area/alunos",
      icon: <Users size={I} aria-hidden />,
      mobileIcon: "users",
      items: [
        { label: t("navStudents"), href: "/admin/alunos", icon: <GraduationCap size={I} aria-hidden />, hint: "Lista, fichas e novo aluno", keywords: "alunos ficha novo aluno" },
        { label: t("navFamilies"), href: "/admin/familias", icon: <Users size={I} aria-hidden />, hint: "Grupos e titulares", keywords: "familia" },
        { label: t("navTrials"), href: "/admin/experimentais", icon: <FlaskConical size={I} aria-hidden />, hint: "Aulas experimentais marcadas", keywords: "experimental trial" },
        { label: "Adesões pendentes", href: "/admin/documentos-adesao", icon: <FileText size={I} aria-hidden />, hint: "Documentos por assinar ou arquivar", keywords: "documentos contrato termo comprovativo" },
        { label: "Indicações", href: "/admin/indicacoes", icon: <Handshake size={I} aria-hidden />, hint: "Alunos que trouxeram amigos", keywords: "referral amigos" },
        { label: "Leads", href: "/admin/leads", icon: <UserPlus size={I} aria-hidden />, hint: "Contactos interessados", keywords: "lista de espera interessados" },
        { label: t("navAthletes"), href: "/admin/atletas", icon: <Dumbbell size={I} aria-hidden />, hint: "Atletas, faixas e XP", keywords: "atleta competicao" },
      ],
    },
    {
      id: "aulas",
      label: "Aulas",
      href: "/admin/area/aulas",
      icon: <CalendarDays size={I} aria-hidden />,
      mobileIcon: "calendar",
      items: [
        { label: t("navClasses"), href: "/admin/turmas", icon: <Layers size={I} aria-hidden />, hint: "Horários e turmas", keywords: "horario turma aula" },
        { label: t("navPresence"), href: "/admin/presenca", icon: <CheckCircle2 size={I} aria-hidden />, hint: "Presenças por aula", keywords: "check-in presencas" },
        { label: "Exames de graduação", href: "/coach/graduacao", icon: <Medal size={I} aria-hidden />, hint: "Convocar e avaliar", keywords: "exame faixa graduacao" },
        { label: "Arbitragem", href: "/coach/arbitragem", icon: <Scale size={I} aria-hidden />, hint: "Combates e juízes", keywords: "juiz combate" },
        { label: t("navEventsAdmin"), href: "/admin/eventos", icon: <Sparkles size={I} aria-hidden />, hint: "Eventos e ingressos", keywords: "evento bilhete" },
        { label: t("navWeekTheme"), href: "/admin/tema-semana", icon: <CalendarCheck size={I} aria-hidden />, keywords: "tema semana" },
        { label: "Cobertura de avaliações", href: "/coach/cobertura-avaliacoes", icon: <ClipboardList size={I} aria-hidden />, hint: "Quem falta avaliar", keywords: "avaliacoes cobertura" },
        { label: t("navModalityInsights"), href: "/admin/desempenho-modalidades", icon: <Activity size={I} aria-hidden />, keywords: "desempenho modalidade" },
      ],
    },
    {
      id: "dinheiro",
      label: "Dinheiro",
      href: "/admin/area/dinheiro",
      icon: <Wallet size={I} aria-hidden />,
      mobileIcon: "credit",
      items: [
        { label: t("navFinance"), href: "/admin/financeiro", icon: <CreditCard size={I} aria-hidden />, hint: "Pagamentos e mensalidades", keywords: "pagamento mensalidade cobrar financeiro" },
        { label: "Relatório financeiro", href: "/admin/financeiro/relatorio", icon: <TrendingUp size={I} aria-hidden />, keywords: "relatorio receita despesas" },
        { label: t("navPlans"), href: "/admin/planos", icon: <Tag size={I} aria-hidden />, hint: "Planos e preços", keywords: "preco plano" },
        { label: t("navLoja"), href: "/admin/loja", icon: <ShoppingBag size={I} aria-hidden />, hint: "Vendas, produtos e stock", keywords: "loja venda pos produtos stock" },
        { label: "Encomendas", href: "/admin/loja/encomendas", icon: <Receipt size={I} aria-hidden />, hint: "Pré-encomendas da loja", keywords: "encomenda camiseta" },
        { label: "Promoções e cupões", href: "/admin/loja/promocoes", icon: <Tag size={I} aria-hidden />, keywords: "desconto cupao promocao" },
      ],
    },
    {
      id: "configurar",
      label: "Configurar",
      href: "/admin/area/configurar",
      icon: <Settings size={I} aria-hidden />,
      mobileIcon: "gear",
      items: [
        { label: t("navSchools"), href: "/admin/escolas", icon: <School size={I} aria-hidden />, keywords: "escola" },
        { label: t("navLocations"), href: "/admin/locais", icon: <MapPin size={I} aria-hidden />, keywords: "local sala morada" },
        { label: t("navModalities"), href: "/admin/modalidades", icon: <Swords size={I} aria-hidden />, keywords: "modalidade muay boxing" },
        { label: t("navCoaches"), href: "/admin/coaches", icon: <Whistle size={I} aria-hidden />, keywords: "coach professor treinador" },
        { label: t("navCourses"), href: "/admin/cursos", icon: <Book size={I} aria-hidden />, keywords: "curso biblioteca video" },
        { label: t("navEvaluationCriteria"), href: "/admin/avaliacao", icon: <ClipboardList size={I} aria-hidden />, keywords: "criterios avaliacao" },
        { label: t("navGeneralDimensions"), href: "/admin/componentes-gerais", icon: <ClipboardList size={I} aria-hidden />, keywords: "componentes dimensoes" },
        { label: t("navEvaluationDocs"), href: "/como-sou-avaliado", icon: <Gauge size={I} aria-hidden />, keywords: "como sou avaliado pontuacao" },
        { label: "Graduação (requisitos)", href: "/admin/graduacao", icon: <Medal size={I} aria-hidden />, keywords: "graduacao faixa requisitos" },
        { label: "Regras de XP", href: "/admin/xp", icon: <Trophy size={I} aria-hidden />, keywords: "xp pontos" },
        { label: t("navMissions"), href: "/admin/missoes", icon: <Target size={I} aria-hidden />, keywords: "missao" },
        { label: "Tribo", href: "/admin/tribo", icon: <Megaphone size={I} aria-hidden />, keywords: "tribo feed publicacoes" },
        { label: t("navGoals"), href: "/admin/metas", icon: <TrendingUp size={I} aria-hidden />, keywords: "metas objetivos" },
        { label: t("navPermissions"), href: "/admin/permissoes", icon: <Lock size={I} aria-hidden />, keywords: "permissao acesso" },
        { label: t("navSettings"), href: "/admin/configuracoes", icon: <Settings size={I} aria-hidden />, keywords: "configuracoes definicoes seguro" },
      ],
    },
  ];
}

/** Só o que o utilizador pode abrir (permissões granulares). Áreas sem nada desaparecem (exceto Hoje). */
export function filterAdminNavAreas(areas: AdminNavArea[], access: ResolvedAdminAccess | null): AdminNavArea[] {
  if (!access || access.kind !== "granted") return areas;
  return areas
    .map((a) => ({ ...a, items: a.items.filter((i) => canAccessAdminPathname(access, i.href)) }))
    .filter((a) => a.id === "hoje" || a.items.length > 0);
}

/** Menu lateral: uma entrada por área; os atalhos só abrem na área ativa. */
export function adminSidebarFromAreas(areas: AdminNavArea[]): SidebarLink[] {
  return areas.map((a) => ({
    label: a.label,
    href: a.href,
    icon: a.icon,
    collapseChildren: true,
    exactMatch: a.id === "hoje",
    children: a.items.map((i) => ({ label: i.label, href: i.href })),
  }));
}

/** Telemóvel: Hoje · Alunos · Aulas · Dinheiro + «Configurar» (sheet com os atalhos, tema e sair). */
export function adminMobileNavFromAreas(areas: AdminNavArea[]): MobileAppBottomNavConfig {
  const byId = new Map(areas.map((a) => [a.id, a]));
  const primary: MobileAppBottomNavItem[] = (["hoje", "alunos", "aulas", "dinheiro"] as const)
    .map((id) => byId.get(id))
    .filter((a): a is AdminNavArea => Boolean(a))
    .map((a) => ({
      label: a.label,
      href: a.href,
      icon: a.mobileIcon,
      exactHref: a.id === "hoje",
      groupActiveHrefs: [a.href, ...a.items.map((i) => i.href)].filter((h) => h !== "/admin"),
    }));
  // A barra precisa de 4 entradas: completa com atalhos de Configurar se faltar alguma área.
  const config = byId.get("configurar");
  const extra = (config?.items ?? []).map((i) => ({ label: i.label, href: i.href, icon: config!.mobileIcon }));
  while (primary.length < 4 && extra.length) primary.push(extra.shift()!);
  return {
    primary: primary as MobileAppBottomNavConfig["primary"],
    overflow: (config?.items ?? []).map((i) => ({ label: i.label, href: i.href, icon: "gear" as const })),
    moreLabel: config?.label ?? "Configurar",
    moreIcon: "gear",
  };
}

export type AdminSearchItem = { label: string; href: string; area: string; keywords: string };

export function adminSearchItems(areas: AdminNavArea[]): AdminSearchItem[] {
  return areas.flatMap((a) => a.items.map((i) => ({ label: i.label, href: i.href, area: a.label, keywords: `${i.keywords ?? ""} ${i.hint ?? ""}` })));
}

/** Tudo o que o shell do admin precisa, já filtrado pelas permissões. */
export function getAdminShellNav(t: (key: MessageKey) => string, access: ResolvedAdminAccess | null) {
  const areas = filterAdminNavAreas(getAdminNavAreas(t), access);
  return {
    areas,
    sidebarLinks: adminSidebarFromAreas(areas),
    mobileBottomNav: adminMobileNavFromAreas(areas),
    searchItems: adminSearchItems(areas),
  };
}
