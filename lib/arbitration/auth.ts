import "server-only";

import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";

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

  return {
    userId: dbUser.id,
    role: dbUser.role,
    isSchoolAssistant: Boolean(schoolAssistant),
  };
}

export function isArbitrationPathAllowed(pathname: string): boolean {
  const path = (pathname.split("?")[0] ?? "").replace(/\/$/, "") || "/";
  return path === "/coach/arbitragem" || path.startsWith("/coach/arbitragem/");
}
