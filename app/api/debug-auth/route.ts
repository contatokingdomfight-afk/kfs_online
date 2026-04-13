import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth/sync-user";

// Endpoint temporário de diagnóstico — REMOVER antes de ir para produção definitiva.
export async function GET() {
  const supabase = await createClient();

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const serviceKeyPresent = serviceKey.length > 10;
  const serviceKeyFirst8 = serviceKeyPresent ? serviceKey.slice(0, 8) + "…" : "(vazia)";

  let authUser: { id: string; email: string | undefined; lastSignIn: string | undefined } | null = null;
  let authError: string | null = null;
  let dbUserDirect: unknown = null;
  let dbDirectError: string | null = null;
  let syncResult: unknown = null;
  let syncError: string | null = null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) authError = error.message;
    if (data?.user) {
      authUser = {
        id: data.user.id,
        email: data.user.email,
        lastSignIn: data.user.last_sign_in_at,
      };

      // Teste 1: leitura direta com client de sessão (RLS)
      const { data: row, error: rowErr } = await supabase
        .from("User")
        .select("id, email, role, authUserId")
        .eq("authUserId", data.user.id)
        .maybeSingle();
      if (rowErr) dbDirectError = rowErr.message;
      if (row) dbUserDirect = row;

      // Teste 2: syncUser com admin client
      try {
        const result = await syncUser(data.user);
        syncResult = {
          userId: result.user?.id,
          role: result.user?.role,
          hasCompletedOnboarding: result.hasCompletedOnboarding,
        };
      } catch (err) {
        syncError = String(err);
      }
    }
  } catch (err) {
    authError = String(err);
  }

  return NextResponse.json({
    serviceRole: {
      present: serviceKeyPresent,
      prefix: serviceKeyFirst8,
    },
    authUser,
    authError,
    dbUserDirect,
    dbDirectError,
    syncResult,
    syncError,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(não definida)",
    timestamp: new Date().toISOString(),
  });
}
