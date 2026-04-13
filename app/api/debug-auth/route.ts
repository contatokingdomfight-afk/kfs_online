import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Endpoint temporário de diagnóstico — REMOVER antes de ir para produção definitiva.
// Não expõe dados sensíveis: apenas IDs parciais e flags de presença.
export async function GET() {
  const supabase = await createClient();

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const serviceKeyPresent = serviceKey.length > 10;
  const serviceKeyFirst8 = serviceKeyPresent ? serviceKey.slice(0, 8) + "…" : "(vazia)";

  let authUser: { id: string; email: string | undefined; lastSignIn: string | undefined } | null = null;
  let authError: string | null = null;
  let dbUser: unknown = null;
  let dbError: string | null = null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) authError = error.message;
    if (data?.user) {
      authUser = {
        id: data.user.id,
        email: data.user.email,
        lastSignIn: data.user.last_sign_in_at,
      };

      const { data: row, error: rowErr } = await supabase
        .from("User")
        .select("id, email, role, authUserId")
        .eq("authUserId", data.user.id)
        .maybeSingle();
      if (rowErr) dbError = rowErr.message;
      if (row) dbUser = row;
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
    dbUser,
    dbError,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(não definida)",
    timestamp: new Date().toISOString(),
  });
}
