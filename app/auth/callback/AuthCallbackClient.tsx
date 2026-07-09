"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { createOAuthCallbackClient } from "@/lib/supabase/client";

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function completeOAuth() {
      const code = searchParams.get("code");
      const next = searchParams.get("next");
      const redirectTo = next && next.startsWith("/") ? next : "/dashboard";

      if (!code) {
        router.replace("/sign-in?error=missing_code");
        return;
      }

      const supabase = createOAuthCallbackClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("[auth/callback] exchangeCodeForSession:", exchangeError.message);
        router.replace(
          `/sign-in?error=exchange_failed&msg=${encodeURIComponent(exchangeError.message)}`
        );
        return;
      }

      const syncRes = await fetch("/api/auth/complete-oauth", {
        method: "POST",
        credentials: "include",
      });

      if (!syncRes.ok) {
        const body = (await syncRes.json().catch(() => null)) as { error?: string } | null;
        const detail = body?.error ?? "sync-failed";
        router.replace(`/sign-in?reason=sync-failed&detail=${encodeURIComponent(detail)}`);
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    }

    void completeOAuth();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-bg">
      <LoadingOverlay open message="A concluir login…" showSpinner />
    </main>
  );
}
