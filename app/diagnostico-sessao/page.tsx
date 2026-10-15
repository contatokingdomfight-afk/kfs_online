"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SNAP_KEY = "kfs_diag_last";

type Snapshot = {
  at: string;
  host: string;
  standalone: boolean;
  authCookies: { name: string; len: number }[];
  hasSession: boolean;
  expiresAt: string | null;
  lsKeys: string[];
};

function readCookies(): { name: string; len: number }[] {
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const i = c.indexOf("=");
      return { name: i === -1 ? c : c.slice(0, i), len: i === -1 ? 0 : c.length - i - 1 };
    })
    .filter((c) => c.name.startsWith("sb-") || c.name.startsWith("kfs_"));
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-PT");
  } catch {
    return iso;
  }
}

/**
 * Diagnóstico da sessão (público, sem dados sensíveis: só nomes e tamanhos de cookies).
 * Abre antes de fechar a app e volta a abrir depois: compara o que havia com o que há.
 */
export default function DiagnosticoSessaoPage() {
  const [now, setNow] = useState<Snapshot | null>(null);
  const [before, setBefore] = useState<Snapshot | null>(null);
  const [ua, setUa] = useState("");

  useEffect(() => {
    void (async () => {
      let prev: Snapshot | null = null;
      try {
        const raw = window.localStorage.getItem(SNAP_KEY);
        prev = raw ? (JSON.parse(raw) as Snapshot) : null;
      } catch {
        prev = null;
      }
      let session: { expires_at?: number } | null = null;
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        session = data.session;
      } catch {
        session = null;
      }
      const lsKeys: string[] = [];
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && (k.startsWith("sb-") || k.startsWith("kfs"))) lsKeys.push(k);
        }
      } catch {
        /* sem localStorage */
      }
      const snap: Snapshot = {
        at: new Date().toISOString(),
        host: window.location.host,
        standalone: window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches,
        authCookies: readCookies(),
        hasSession: Boolean(session),
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        lsKeys,
      };
      setUa(navigator.userAgent);
      setBefore(prev);
      setNow(snap);
      try {
        window.localStorage.setItem(SNAP_KEY, JSON.stringify(snap));
      } catch {
        /* ignora */
      }
    })();
  }, []);

  const box: React.CSSProperties = { padding: 14, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-secondary)", display: "flex", flexDirection: "column", gap: 4, fontSize: 14 };

  function Block({ title, s }: { title: string; s: Snapshot | null }) {
    if (!s) return (
      <div style={box}>
        <strong>{title}</strong>
        <span style={{ color: "var(--text-secondary)" }}>Sem registo (primeira abertura desta página neste aparelho).</span>
      </div>
    );
    return (
      <div style={box}>
        <strong>{title}</strong>
        <span>Quando: {fmt(s.at)}</span>
        <span>Endereço: {s.host}</span>
        <span>Como app instalada: {s.standalone ? "sim" : "não (browser)"}</span>
        <span>
          Sessão: <strong style={{ color: s.hasSession ? "var(--success)" : "var(--danger)" }}>{s.hasSession ? "ATIVA" : "SEM SESSÃO"}</strong>
          {s.expiresAt ? ` (JWT até ${fmt(s.expiresAt)})` : ""}
        </span>
        <span>Cookies de sessão: {s.authCookies.length ? s.authCookies.map((c) => `${c.name} (${c.len})`).join(", ") : "nenhum"}</span>
        <span>localStorage: {s.lsKeys.length ? s.lsKeys.join(", ") : "nenhuma chave"}</span>
      </div>
    );
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Diagnóstico da sessão</h1>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
        1) Entra na app e abre esta página. 2) Fecha a app. 3) Volta a abrir esta página. Compara os dois quadros e manda-os ao suporte.
      </p>
      <Block title="Agora" s={now} />
      <Block title="Na abertura anterior" s={before} />
      {ua ? <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", wordBreak: "break-word" }}>Aparelho: {ua}</p> : null}
    </main>
  );
}
