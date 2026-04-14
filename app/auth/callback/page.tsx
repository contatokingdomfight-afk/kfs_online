"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LOG_PREFIX = "[KFS-AUTH-CALLBACK]";
function dbg(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(LOG_PREFIX, ...args);
}

function getAuthCookieNames(): string[] {
  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?.replace("https://", "").split(".")[0] ?? "";
  return document.cookie
    .split(";")
    .map(c => c.trim().split("=")[0])
    .filter(n => n.includes(ref));
}

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const handled = useRef(false);
  const [status, setStatus] = useState("A autenticar…");

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const next = searchParams.get("next");
    const redirectTo = next && next.startsWith("/") ? next : "/dashboard";
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");

    dbg("=== INÍCIO DO CALLBACK ===");
    dbg("URL:", window.location.href);
    dbg("code presente:", !!code, "| primeiros 10:", code?.slice(0, 10));
    dbg("error param:", errorParam, errorDesc);
    dbg("Cookies antes de limpeza:", document.cookie.split(";").map(c => c.trim().split("=")[0]).join(", "));

    if (errorParam) {
      dbg("ERRO OAuth:", errorParam, errorDesc);
      window.location.href = `/sign-in?error=oauth_error&desc=${encodeURIComponent(errorDesc ?? errorParam)}`;
      return;
    }

    if (!code) {
      dbg("ERRO: Sem ?code= na URL");
      window.location.href = "/sign-in?error=missing_code";
      return;
    }

    // Limpar tokens de sessão antigos (não o code-verifier — necessário para o exchange)
    const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "").split(".")[0] ?? "";
    [`sb-${ref}-auth-token`, `sb-${ref}-auth-token.0`, `sb-${ref}-auth-token.1`, `sb-${ref}-auth-token.2`]
      .forEach(name => {
        document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
        document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax; Secure`;
      });
    dbg("Cookies após limpeza:", document.cookie.split(";").map(c => c.trim().split("=")[0]).join(", "));

    // Usar o mesmo cliente que a página de sign-in (detectSessionInUrl: true por defeito)
    // O createBrowserClient deteta automaticamente o ?code= e faz o exchange com o
    // code-verifier correto (mesmo storage adapter, mesmos cookies)
    const supabase = createClient();
    let finished = false;

    function finish(to: string) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      sub?.unsubscribe();
      const authCookies = getAuthCookieNames();
      dbg("FINISH — auth cookies presentes:", authCookies.join(", ") || "⚠️ NENHUM");
      dbg("A navegar para:", to);
      setStatus("A redirecionar…");
      window.location.href = to;
    }

    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        dbg("onAuthStateChange:", event, "session:", !!session, "user:", session?.user?.email, "id:", session?.user?.id);
        if (event === "SIGNED_IN" && session) {
          dbg("SIGNED_IN confirmado — redirecionando");
          finish(redirectTo);
        }
        if (event === "SIGNED_OUT") {
          dbg("SIGNED_OUT durante callback");
        }
      }
    );

    const timeout = setTimeout(() => {
      dbg("TIMEOUT 15s — cookies:", getAuthCookieNames().join(", ") || "NENHUM");
      finish("/sign-in?error=exchange_failed");
    }, 15000);

    return () => {
      finished = true;
      clearTimeout(timeout);
      sub?.unsubscribe();
    };
  }, [searchParams]);

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
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <span>{status}</span>
      <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>
        (ver consola do browser para detalhes)
      </span>
    </div>
  );
}
