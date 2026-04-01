"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type RequestPasswordResetState = { error?: string; success?: boolean };

async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  return "http://localhost:3000";
}

/**
 * PKCE: o code verifier tem de ficar em cookies (mesmo jar que o callback).
 * Por isso resetPasswordForEmail corre no servidor com @supabase/ssr + cookies().
 */
export async function requestPasswordReset(
  _prev: RequestPasswordResetState | null,
  formData: FormData
): Promise<RequestPasswordResetState> {
  const email = (formData.get("email") as string)?.trim();
  if (!email) {
    return { error: "Indica o teu email." };
  }

  const origin = await getRequestOrigin();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    return { error: error.message };
  }
  return { success: true };
}
