"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_READONLY_MESSAGE, isDemoAllowedWrite, type DemoRole } from "@/lib/demo";

type Props = { role: DemoRole };

const btn: React.CSSProperties = {
  padding: "4px 12px",
  fontSize: 12,
  fontWeight: 500,
  border: "1px solid rgba(255,255,255,0.8)",
  borderRadius: 6,
  backgroundColor: "transparent",
  color: "#fff",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

/** Escritas que o browser faria: server actions / API da app e escritas diretas ao Supabase (exceto Auth). */
function isBlockedWrite(input: RequestInfo | URL, init?: RequestInit): boolean {
  const req = input instanceof Request ? input : null;
  const method = (init?.method ?? req?.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  let url: URL;
  try {
    url = new URL(req ? req.url : String(input), window.location.href);
  } catch {
    return false;
  }
  if (url.origin === window.location.origin) return !isDemoAllowedWrite(url.pathname);
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabase && url.href.startsWith(supabase)) return !url.pathname.startsWith("/auth/v1/");
  return false;
}

/**
 * Faixa «Modo demonstração» + travão de escritas no cliente. O middleware também as recusa (403);
 * aqui evita-se o erro: o pedido não sai, aparece um aviso e a promessa fica pendente.
 */
export function DemoModeBanner({ role }: Props) {
  const [notice, setNotice] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const original = window.fetch;
    const show = () => {
      setNotice(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setNotice(false), 5000);
    };
    window.fetch = function demoFetch(input: RequestInfo | URL, init?: RequestInit) {
      if (isBlockedWrite(input, init)) {
        show();
        return new Promise<Response>(() => {});
      }
      return original.call(window, input, init);
    } as typeof window.fetch;
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      if (form && form.method?.toLowerCase() === "post" && !form.action.includes("/demo/")) {
        // Formulários com server action são tratados pelo fetch; os HTML puros param aqui.
        if (!form.getAttribute("action")?.startsWith("javascript:")) {
          e.preventDefault();
          show();
        }
      }
    };
    document.addEventListener("submit", onSubmit, true);
    return () => {
      window.fetch = original;
      document.removeEventListener("submit", onSubmit, true);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const other: DemoRole = role === "aluno" ? "professor" : "aluno";

  return (
    <>
      <div
        className="view-as-banner-root"
        style={{
          padding: "8px 16px",
          backgroundColor: "var(--primary)",
          color: "#fff",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span>Modo demonstração · dados fictícios, nada é gravado.</span>
        <span style={{ display: "flex", gap: 8 }}>
          <a href={`/demo/entrar?como=${other}`} style={btn}>
            Ver como {other}
          </a>
          <a href="/demo/sair" style={btn}>
            Sair
          </a>
        </span>
      </div>
      {notice && (
        <div
          role="status"
          style={{
            position: "fixed",
            left: "50%",
            bottom: 88,
            transform: "translateX(-50%)",
            zIndex: 1000,
            width: "min(92vw, 420px)",
            background: "var(--card, #151515)",
            color: "var(--text, #f2f2f2)",
            border: "1px solid var(--border, #333)",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <strong style={{ display: "block", marginBottom: 2 }}>{DEMO_READONLY_MESSAGE}</strong>
          <span style={{ opacity: 0.8, fontSize: 13 }}>
            Na tua conta real isto ficava guardado.{" "}
            <a href="/aula-experimental" style={{ color: "var(--primary)", textDecoration: "underline" }}>
              Marcar aula experimental
            </a>
          </span>
        </div>
      )}
    </>
  );
}
