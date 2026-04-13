"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Callback OAuth client-side: o browser Supabase client faz o exchange do code
 * e guarda a sessão via document.cookie (sem depender de Set-Cookie em redirects
 * server-side, que o Vercel/Next.js 15 pode não propagar corretamente em 307).
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get("code");
    const next = searchParams.get("next");
    const redirectTo = next && next.startsWith("/") ? next : "/dashboard";

    if (!code) {
      router.replace("/sign-in?error=missing_code");
      return;
    }

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error("[callback] exchange error:", error.message);
        router.replace("/sign-in?error=exchange_failed");
        return;
      }
      router.replace(redirectTo);
    });
  }, [router, searchParams]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #0a0a0a)",
        color: "var(--text-secondary, #888)",
        fontSize: "1rem",
      }}
    >
      A autenticar…
    </div>
  );
}
