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

    // Limpar TODOS os cookies de sessão Supabase antigos antes do code exchange.
    // Sem esta limpeza, o cliente tenta refrescar a sessão anterior em paralelo
    // com o detectSessionInUrl — condição de corrida que pode sobrescrever ou
    // apagar a sessão nova antes da navegação para /dashboard.
    const supabaseRef = process.env.NEXT_PUBLIC_SUPABASE_URL
      ?.replace("https://", "")
      .split(".")[0];
    if (supabaseRef) {
      const cookiesToClear = [
        `sb-${supabaseRef}-auth-token`,
        `sb-${supabaseRef}-auth-token.0`,
        `sb-${supabaseRef}-auth-token.1`,
        `sb-${supabaseRef}-auth-token.2`,
        `sb-${supabaseRef}-auth-token.3`,
        `sb-${supabaseRef}-auth-token.4`,
      ];
      cookiesToClear.forEach((name) => {
        document.cookie = `${name}=; max-age=0; path=/; sameSite=lax`;
      });
      dbg("Cookies de sessão antigos limpos. Ref:", supabaseRef);
    }
    dbg("Cookies após limpeza:", document.cookie.split(";").map(c => c.trim().split("=")[0]).join(", "));

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
        dbg("onAuthStateChange:", event, "session presente:", !!session, "user:", session?.user?.email, "user.id:", session?.user?.id);
        // Só reagir a SIGNED_IN (novo login) — ignorar INITIAL_SESSION, SIGNED_OUT, etc.
        if (event === "SIGNED_IN" && session) {
          dbg("SIGNED_IN confirmado — redirecionando para dashboard");
          finish(redirectTo);
        }
        if (event === "SIGNED_OUT") {
          dbg("SIGNED_OUT recebido durante callback — sessão foi limpa, aguardar SIGNED_IN do code exchange");
        }
      }
    );

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
