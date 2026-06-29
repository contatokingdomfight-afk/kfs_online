"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
};

export default function GlobalError({ error }: Props) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0f0f0f", color: "#f5f5f5" }}>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Algo correu mal</h1>
          <p style={{ margin: 0, maxWidth: 420, opacity: 0.85 }}>Tenta recarregar a página.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "#c41e3a",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
