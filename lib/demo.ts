/**
 * Experiência demo (sem login): contas fixas de aluno e professor da «Escola Demo», só de leitura.
 *
 * - Entrada: `/demo/entrar?como=aluno|professor` (gera um magic link no servidor; não há palavra-passe).
 * - Só leitura: o middleware recusa escritas destas contas e o `DemoModeGuard` (cliente) trava-as antes
 *   de saírem, mostrando um aviso.
 * - A Escola Demo fica «em preparação» (isActive=false, openedAt=null): aparece no back-office, mas
 *   não no registo nem nas páginas públicas; o Admin Geral em «Todas» não a conta (ver `scopedSchoolIds`).
 */

export const DEMO_SCHOOL_ID = "demo-school";

export const DEMO_STUDENT_EMAIL = "demo.aluno@kingdomfight.com";
export const DEMO_COACH_EMAIL = "demo.professor@kingdomfight.com";

export type DemoRole = "aluno" | "professor";

export const DEMO_ACCOUNTS: Record<DemoRole, { email: string; home: string }> = {
  aluno: { email: DEMO_STUDENT_EMAIL, home: "/dashboard" },
  professor: { email: DEMO_COACH_EMAIL, home: "/coach" },
};

/** Contas da Escola Demo (as dos botões e os alunos fictícios demo.aluno2@…): só leitura, sem emails. */
export function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^demo\.(aluno|professor)\d*@kingdomfight\.com$/.test(email.trim().toLowerCase());
}

export function parseDemoRole(value: string | null | undefined): DemoRole | null {
  return value === "aluno" || value === "professor" ? value : null;
}

/** Pedidos de escrita que a conta demo pode fazer: só sair e renovar sessão. */
export function isDemoAllowedWrite(pathname: string): boolean {
  return pathname.startsWith("/demo/") || pathname.startsWith("/auth/");
}

export const DEMO_READONLY_MESSAGE = "Isto é uma demonstração: nada é gravado.";
