"use client";

import { useEffect, useState } from "react";
import { BrandSplashLogo } from "@/components/BrandSplashLogo";
import { BRAND_ICON_BG } from "@/lib/brand";

const SESSION_KEY = "kfs-dashboard-splash-shown";

type Props = {
  locale: string;
  /** Nome do utilizador para personalizar a mensagem (opcional). */
  displayName?: string | null;
};

/**
 * Mostra um splash screen de ecrã inteiro ao abrir o dashboard pela primeira vez por sessão.
 * Usa sessionStorage para não repetir em navegações subsequentes.
 */
export function DashboardSplash({ locale, displayName }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    const alreadyShown = sessionStorage.getItem(SESSION_KEY);
    if (!alreadyShown) {
      setVisible(true);
      sessionStorage.setItem(SESSION_KEY, "1");
      const timer = setTimeout(() => setVisible(false), 1400);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const isPt = locale === "pt";
  const name = displayName?.split(" ")[0] ?? (isPt ? "Guerreiro" : "Warrior");
  const greeting = isPt ? `Olá, ${name}!` : `Hi, ${name}!`;
  const subtitle = isPt ? "A carregar o teu perfil…" : "Loading your profile…";

  return (
    <div
      aria-live="polite"
      aria-busy="true"
      aria-label={subtitle}
      onClick={() => setVisible(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        backgroundColor: BRAND_ICON_BG,
        cursor: "default",
        animation: "kfs-splash-in 0.2s ease",
      }}
    >
      <BrandSplashLogo variant="compact" className="kfs-brand-splash-logo-enter" />

      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
        <p
          style={{
            margin: 0,
            fontSize: "clamp(20px, 5vw, 24px)",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.2,
          }}
        >
          {greeting}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-secondary)",
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Spinner */}
      <div
        role="progressbar"
        aria-valuetext={subtitle}
        style={{
          width: 36,
          height: 36,
          border: "3px solid var(--border)",
          borderTopColor: "var(--primary)",
          borderRadius: "50%",
          animation: "kfs-splash-spin 0.8s linear infinite",
          flexShrink: 0,
        }}
      />

      <style>{`
        @keyframes kfs-splash-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes kfs-splash-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
