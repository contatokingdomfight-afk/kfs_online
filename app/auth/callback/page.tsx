"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Callback OAuth. O createBrowserClient tem detectSessionInUrl: true que processa
 * automaticamente o ?code= da URL via initialize(). Apenas aguardamos o evento
 * SIGNED_IN ou verificamos getSession() — não chamamos exchangeCodeForSession
 * manualmente (isso consumiria o code_verifier antes do auto-processing e causaria
 * "PKCE code verifier not found").
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const next = searchParams.get("next");
    const redirectTo = next && next.startsWith("/") ? next : "/dashboard";
    const code = searchParams.get("code");

    if (!code) {
      router.replace("/sign-in?error=missing_code");
      return;
    }

    const supabase = createClient();
    let finished = false;

    function finish(to: string) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      sub?.unsubscribe();
      // Navegação completa para garantir que os cookies de sessão recém-criados
      // pelo browser client são enviados num pedido HTTP fresco ao servidor.
      // router.replace() usa fetch client-side que pode não incluir os cookies
      // imediatamente após serem escritos via document.cookie.
      window.location.href = to;
    }

    // Ouvir sessão que o detectSessionInUrl vai criar automaticamente
    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          finish(redirectTo);
        }
        // INITIAL_SESSION sem sessão = initialize() ainda a decorrer, aguardar SIGNED_IN
      }
    );

    // Verificar sessão já disponível (se initialize() já completou antes do subscribe)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish(redirectTo);
    });

    // Timeout de segurança — se em 12s nada aconteceu, algo falhou
    const timeout = setTimeout(() => {
      finish("/sign-in?error=exchange_failed");
    }, 12000);

    return () => {
      finished = true;
      clearTimeout(timeout);
      sub?.unsubscribe();
    };
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
