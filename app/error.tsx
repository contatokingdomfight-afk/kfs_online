"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    console.error("[app/error]", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-4, 16px)",
        padding: "var(--space-6, 24px)",
        background: "var(--bg)",
        color: "var(--text-primary)",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "var(--text-xl, 1.25rem)", fontWeight: 600, margin: 0 }}>
        Algo correu mal
      </h1>
      <p style={{ fontSize: "var(--text-base, 1rem)", color: "var(--text-secondary)", margin: 0, maxWidth: 420 }}>
        Ocorreu um erro inesperado. Podes tentar de novo ou voltar ao painel.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 8 }}>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: "var(--primary)",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
        <Link
          href="/dashboard"
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Ir para o painel
        </Link>
      </div>
    </div>
  );
}
