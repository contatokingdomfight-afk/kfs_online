"use server";

import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth/sync-user";

/**
 * Sincroniza o utilizador após sign-up (email/senha) e retorna o redirect apropriado.
 * Chamar após supabase.auth.signUp() bem-sucedido.
 */
export async function syncUserAfterSignUp(): Promise<{ redirect: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão não encontrada. Tenta fazer login novamente." };
  }
  try {
    const { hasCompletedOnboarding } = await syncUser(user);
    return { redirect: hasCompletedOnboarding ? "/dashboard" : "/onboarding" };
  } catch (err) {
    console.error("syncUserAfterSignUp:", err);
    return { error: err instanceof Error ? err.message : "Erro ao criar perfil." };
  }
}
