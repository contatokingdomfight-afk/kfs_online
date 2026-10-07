import "server-only";

import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";

/** Exames de graduação: ADMIN ou COACH (com permissão de alunos, quando há permissões granulares). */
export async function requireGraduationExamPage(): Promise<{ userId: string; role: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "ADMIN" && dbUser.role !== "COACH") redirect("/dashboard");
  if (await adminPermissionError("admin:alunos:read")) redirect("/coach");
  return { userId: dbUser.id, role: dbUser.role };
}

/** Para server actions: devolve o utilizador ou uma mensagem de erro. */
export async function graduationExamActionAuth(): Promise<{ userId: string } | { error: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "COACH")) return { error: "Não autorizado." };
  const permErr = await adminPermissionError("admin:alunos:write");
  if (permErr) return { error: permErr };
  return { userId: dbUser.id };
}
