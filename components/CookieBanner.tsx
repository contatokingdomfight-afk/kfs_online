"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "kfs_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function save(value: "all" | "essential") {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: "clamp(12px, 3vw, 16px)",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "12px 16px",
          justifyContent: "space-between",
        }}
      >
        <p style={{ margin: 0, flex: "1 1 240px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Usamos cookies para melhorar a experiência. Consulta a nossa{" "}
          <Link href="/privacidade" style={{ color: "var(--primary)", fontWeight: 500 }}>
            política de privacidade
          </Link>
          .
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="btn btn-secondary" style={{ fontSize: 14 }} onClick={() => save("essential")}>
            Apenas essenciais
          </button>
          <button type="button" className="btn btn-primary" style={{ fontSize: 14 }} onClick={() => save("all")}>
            Aceitar todos
          </button>
        </div>
      </div>
    </div>
  );
}
