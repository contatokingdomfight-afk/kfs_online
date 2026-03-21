"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

type Props = {
  siteHomeLabel: string;
  dashboardLabel: string;
  signOutLabel: string;
};

export function EscolherPlanoToolbar({ siteHomeLabel, dashboardLabel, signOutLabel }: Props) {
  return (
    <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <Link
            href="/dashboard"
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              textDecoration: "underline",
            }}
          >
            ← {dashboardLabel}
          </Link>
          <Link
            href="/"
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              textDecoration: "underline",
            }}
          >
            ← {siteHomeLabel}
          </Link>
        </div>
        <LogoutButton label={signOutLabel} variant="button" />
      </div>
    </div>
  );
}
