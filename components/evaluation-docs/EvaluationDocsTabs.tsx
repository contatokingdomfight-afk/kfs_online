"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  labelComo: string;
  labelSistema: string;
  ariaLabel: string;
};

export function EvaluationDocsTabs({ labelComo, labelSistema, ariaLabel }: Props) {
  const pathname = usePathname() ?? "";
  const activeComo = pathname === "/como-sou-avaliado" || pathname.startsWith("/como-sou-avaliado/");
  const activeSistema = pathname === "/sistema-pontuacao" || pathname.startsWith("/sistema-pontuacao/");

  const tabStyle = (active: boolean) =>
    ({
      display: "inline-flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: "10px 18px",
      fontSize: "clamp(14px, 3.5vw, 15px)",
      fontWeight: active ? 700 : 600,
      borderRadius: "var(--radius-md, 10px)",
      textDecoration: "none" as const,
      color: active ? "#fff" : "var(--text-primary)",
      backgroundColor: active ? "var(--primary)" : "var(--bg-secondary)",
      border: active ? "2px solid var(--primary)" : "2px solid var(--border)",
      transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
    }) satisfies CSSProperties;

  return (
    <nav aria-label={ariaLabel} style={{ marginBottom: "clamp(16px, 4vw, 22px)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          paddingBottom: 12,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link href="/como-sou-avaliado" prefetch={false} style={tabStyle(activeComo)}>
          {labelComo}
        </Link>
        <Link href="/sistema-pontuacao" prefetch={false} style={tabStyle(activeSistema)}>
          {labelSistema}
        </Link>
      </div>
    </nav>
  );
}
