"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

type Props = {
  siteHomeLabel: string;
  signOutLabel: string;
};

export function EscolherPlanoToolbar({ siteHomeLabel, signOutLabel }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 24,
      }}
    >
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
      <LogoutButton label={signOutLabel} variant="button" />
    </div>
  );
}
