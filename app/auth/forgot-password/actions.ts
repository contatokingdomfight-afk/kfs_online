"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type RequestPasswordResetState = { error?: string; success?: boolean };

/**
 * URL base para redirectTo do Supabase Auth. Tem de coincidir com uma entrada em
 * Supabase → Authentication → URL Configuration → Redirect URLs (ex.: …/auth/callback**).
 * Ordem: forwarded headers (domínio real do browser na Vercel) → VERCEL_URL → NEXT_PUBLIC_APP_URL → localhost.
 */
async function getPasswordResetSiteUrl(): Promise<string> {
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host")?.split(",")[0]?.trim();
  const rawProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = rawProto === "http" || rawProto === "https" ? rawProto : "https";
  if (forwardedHost) {
    return `${proto}://${forwardedHost}`;
  }
  const host = h.get("host");
  if (host && host.length > 0) {
    const localProto = host.includes("localhost") || host.startsWith("127.") ? "http" : proto;
    return `${localProto}://${host}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim();
  if (appUrl) return appUrl;
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

  const siteUrl = await getPasswordResetSiteUrl();
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    console.error("[forgot-password] resetPasswordForEmail:", error.message, "| redirectTo:", redirectTo);
    let msg = error.message;
    if (/redirect|url|not allowed|invalid/i.test(msg)) {
      msg += " Verifica no Supabase → Authentication → URL Configuration se este redirect está permitido: " + redirectTo;
    }
    return { error: msg };
  }
  return { success: true };
}
