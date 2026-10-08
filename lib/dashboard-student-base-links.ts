/** Um destino da navegação do aluno (a estrutura em áreas vive em `lib/dashboard-student-nav.ts`). */
export type DashboardNavLinkInput = {
  label: string;
  href: string;
  prefetch?: boolean;
  groupActiveHrefs?: string[];
};
