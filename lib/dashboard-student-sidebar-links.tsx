import "server-only";

import { Home, LineChart, Dumbbell, Users, Sparkles, UserRound } from "lucide-react";
import type { SidebarLink } from "@/components/Sidebar";
import type { StudentNavArea, StudentNavAreaId } from "@/lib/dashboard-student-nav";

const ICON_SIZE = 20;

/**
 * Ícones das áreas, já como elementos (não referências de componente): a lista atravessa a
 * fronteira Server → Client em `<ResponsiveShell>` — ver nota em lib/admin-sidebar-links.tsx.
 */
function areaIcon(id: StudentNavAreaId) {
  switch (id) {
    case "hoje":
      return <Home size={ICON_SIZE} />;
    case "evolucao":
      return <LineChart size={ICON_SIZE} />;
    case "treino":
      return <Dumbbell size={ICON_SIZE} />;
    case "tribo":
      return <Users size={ICON_SIZE} />;
    case "plano":
      return <Sparkles size={ICON_SIZE} />;
    case "conta":
      return <UserRound size={ICON_SIZE} />;
  }
}

/** Barra lateral do aluno: uma entrada por área; as sub-páginas abrem só na área activa. */
export function buildStudentSidebarLinks(areas: StudentNavArea[]): SidebarLink[] {
  return areas.map((area) => ({
    label: area.label,
    href: area.href,
    prefetch: area.prefetch,
    icon: areaIcon(area.id),
    collapseChildren: true,
    children: area.children.length > 0 ? area.children.map((c) => ({ ...c })) : undefined,
  }));
}
