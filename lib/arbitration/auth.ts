import "server-only";

import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";
import { adminPermissionErrorOrSchoolAssistant } from "@/lib/permissions/assert";

export type ArbitrationAccess = {
  userId: string;
  role: string;
  isSchoolAssistant: boolean;
};

/** Apenas ADMIN, COACH ou assistente de professor activo. */
export async function requireArbitrationAccess(): Promise<ArbitrationAccess> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");

  const supabase = await createClient();
  const schoolAssistant =
    dbUser.role === "ALUNO" ? await getActiveSchoolAssistantForUserId(supabase, dbUser.id) : null;

  if (dbUser.role !== "ADMIN" && dbUser.role !== "COACH" && !schoolAssistant) {
    redirect("/dashboard");
  }

  // Permissões granulares v1 (mapeadas em lib/permissions/paths.ts: /coach/arbitragem → admin:sistema).
  // "read" aqui porque esta função também gate as páginas de visualização (histórico, combate);
  // as acções verdadeiramente destrutivas (ex. apagar combate) usam requireArbitrationAdmin, que
  // exige escrita a seguir. O assistente já foi validado acima; o helper "OrSchoolAssistant"
  // reconfirma-o sem bloquear (role ALUNO ficaria sempre "none" no check normal).
  if (await adminPermissionErrorOrSchoolAssistant("admin:sistema:read")) {
    redirect("/dashboard");
  }

  return {
    userId: dbUser.id,
    role: dbUser.role,
    isSchoolAssistant: Boolean(schoolAssistant),
  };
}

/** Apenas ADMIN (gestão sensível: apagar combates, etc.). */
export async function requireArbitrationAdmin(): Promise<ArbitrationAccess> {
  const access = await requireArbitrationAccess();
  if (access.role !== "ADMIN") {
    throw new Error("Apenas administradores podem realizar esta ação.");
  }
  if (await adminPermissionErrorOrSchoolAssistant("admin:sistema:write")) {
    throw new Error("Não autorizado.");
  }
  return access;
}

export function isArbitrationPathAllowed(pathname: string): boolean {
  const path = (pathname.split("?")[0] ?? "").replace(/\/$/, "") || "/";
  return path === "/coach/arbitragem" || path.startsWith("/coach/arbitragem/");
}
