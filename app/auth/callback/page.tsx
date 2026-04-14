"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";

const SUPABASE_REF = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?.replace("https://", "")
  .split(".")[0] ?? "";

const LOG_PREFIX = "[KFS-AUTH-CALLBACK]";
function dbg(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(LOG_PREFIX, ...args);
}

function getAuthCookieNames(): string[] {
  return document.cookie
    .split(";")
    .map(c => c.trim().split("=")[0])
    .filter(n => n.includes(SUPABASE_REF));
}

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const handled = useRef(false);
  const [status, setStatus] = useState("A autenticar…");

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    void (async () => {
      const next = searchParams.get("next");
      const redirectTo = next && next.startsWith("/") ? next : "/dashboard";
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      const errorDesc = searchParams.get("error_description");

      dbg("=== INÍCIO DO CALLBACK ===");
      dbg("URL:", window.location.href);
      dbg("SUPABASE_REF:", SUPABASE_REF);
      dbg("code presente:", !!code, "| primeiros 10:", code?.slice(0, 10));
      dbg("error param:", errorParam, errorDesc);
      dbg("Cookies disponíveis:", document.cookie.split(";").map(c => c.trim().split("=")[0]).join(", "));

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

      // 1. Limpar cookies de sessão antigos (mantém o code-verifier que é necessário para o exchange)
      const sessionCookiesToClear = [
        `sb-${SUPABASE_REF}-auth-token`,
        `sb-${SUPABASE_REF}-auth-token.0`,
        `sb-${SUPABASE_REF}-auth-token.1`,
        `sb-${SUPABASE_REF}-auth-token.2`,
        `sb-${SUPABASE_REF}-auth-token.3`,
      ];
      sessionCookiesToClear.forEach(name => {
        document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
        document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax; Secure`;
      });
      dbg("Cookies após limpeza:", document.cookie.split(";").map(c => c.trim().split("=")[0]).join(", "));

      // 2. Criar cliente com detectSessionInUrl:false — usamos exchangeCodeForSession manual
      //    para ter controlo total e evitar race conditions com sessão antiga
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookieOptions: supabaseCookieOptions,
          auth: { detectSessionInUrl: false, persistSession: true, autoRefreshToken: false },
        }
      );

      // 3. Trocar o code por sessão
      dbg("A chamar exchangeCodeForSession…");
      setStatus("A trocar código de autorização…");

      const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeErr) {
        dbg("ERRO exchangeCodeForSession:", exchangeErr.message, exchangeErr);
        setStatus(`Erro: ${exchangeErr.message}`);
        window.location.href = `/sign-in?error=exchange_failed`;
        return;
      }

      if (!data.session) {
        dbg("AVISO: exchangeCodeForSession sem sessão");
        window.location.href = `/sign-in?error=no_session`;
        return;
      }

      dbg("exchangeCodeForSession OK!");
      dbg("  user:", data.session.user.email, "| id:", data.session.user.id);
      dbg("  access_token (20 chars):", data.session.access_token.slice(0, 20) + "…");
      dbg("  expires_at:", data.session.expires_at);

      // 4. Verificar que os cookies foram escritos
      const authCookiesAfter = getAuthCookieNames();
      dbg("Auth cookies após exchange:", authCookiesAfter.join(", ") || "⚠️ NENHUM — cookies NÃO foram escritos!");

      if (authCookiesAfter.length === 0) {
        dbg("DIAGNÓSTICO: sessão em memória mas sem cookies — a tentar setSession explícito…");
        // Tentar forçar escrita dos cookies chamando setSession
        const { error: setErr } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (setErr) {
          dbg("ERRO setSession:", setErr.message);
        }
        const authCookiesRetry = getAuthCookieNames();
        dbg("Auth cookies após setSession:", authCookiesRetry.join(", ") || "⚠️ AINDA NENHUM");
      }

      // 5. Navegar para o dashboard
      dbg("FINISH — auth cookies finais:", getAuthCookieNames().join(", ") || "NENHUM");
      dbg("A navegar para:", redirectTo);
      setStatus(`A redirecionar…`);

      // Pequeno delay para garantir que document.cookie foi commitado antes da navegação
      await new Promise(r => setTimeout(r, 150));
      window.location.href = redirectTo;
    })();
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
