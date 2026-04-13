"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LOG_PREFIX = "[KFS-AUTH-CALLBACK]";
function dbg(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(LOG_PREFIX, ...args);
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
    dbg("code presente:", !!code, "| code (primeiros 10 chars):", code?.slice(0, 10));
    dbg("error param:", errorParam, errorDesc);
    dbg("Cookies disponíveis:", document.cookie.split(";").map(c => c.trim().split("=")[0]).join(", "));

    if (errorParam) {
      dbg("ERRO OAuth vindo do Supabase/Google:", errorParam, errorDesc);
      setStatus(`Erro: ${errorParam}`);
      window.location.href = `/sign-in?error=oauth_error&desc=${encodeURIComponent(errorDesc ?? errorParam)}`;
      return;
    }

    if (!code) {
      dbg("ERRO: Sem ?code= na URL");
      setStatus("Erro: sem código de autorização");
      window.location.href = "/sign-in?error=missing_code";
      return;
    }

    const supabase = createClient();
    let finished = false;

    function finish(to: string) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      sub?.unsubscribe();
      dbg("FINISH chamado — navegando para:", to);
      setStatus(`A redirecionar para ${to}…`);
      window.location.href = to;
    }

    dbg("Registando onAuthStateChange e aguardando SIGNED_IN…");

    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        dbg("onAuthStateChange:", event, "session presente:", !!session, "user:", session?.user?.email);
        if (session) {
          dbg("Sessão obtida via onAuthStateChange — redirecionando para dashboard");
          finish(redirectTo);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      dbg("getSession resultado:", !!session, "erro:", error?.message);
      if (session) {
        dbg("Sessão já disponível via getSession");
        finish(redirectTo);
      }
    });

    const timeout = setTimeout(() => {
      dbg("TIMEOUT 12s — nenhuma sessão obtida, possível falha no code exchange");
      dbg("Cookies no timeout:", document.cookie.split(";").map(c => c.trim().split("=")[0]).join(", "));
      setStatus("Timeout — redirecionando para login");
      finish("/sign-in?error=exchange_failed");
    }, 12000);

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
