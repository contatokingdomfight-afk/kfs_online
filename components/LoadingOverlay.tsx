"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  message: string;
  /** Por omissão mostra o spinner; desativar na fase final (ex.: “a redirecionar”). */
  showSpinner?: boolean;
};

const SLOW_AFTER_MS = 8000;

/** Overlay de carregamento (spinner + texto). Reutilizável em formulários client-side. */
export function LoadingOverlay({ open, message, showSpinner = true }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!open) {
      setDismissed(false);
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open || dismissed) return null;

  const titleId = "loading-overlay-title";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-live="polite"
      aria-labelledby={titleId}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        boxSizing: "border-box",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 300,
          padding: "clamp(24px, 5vw, 32px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        {showSpinner ? (
          <div
            role="progressbar"
            aria-valuetext={message}
            style={{
              width: 40,
              height: 40,
              border: "3px solid var(--border)",
              borderTopColor: "var(--primary)",
              borderRadius: "50%",
              animation: "loading-overlay-spin 0.8s linear infinite",
            }}
          />
        ) : null}
        <p
          id={titleId}
          style={{
            margin: 0,
            fontSize: "clamp(15px, 3.8vw, 17px)",
            fontWeight: 500,
            color: "var(--text-primary)",
            textAlign: "center",
            lineHeight: 1.45,
          }}
        >
          {message}
        </p>
        {slow && (
          <>
            <p
              role="status"
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--text-secondary)",
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              Isto está a demorar mais que o normal. É provável que já tenha sido concluído — podes fechar e
              confirmar.
            </p>
            <button type="button" className="btn btn-secondary" onClick={() => setDismissed(true)}>
              Fechar
            </button>
          </>
        )}
        <style>{`
          @keyframes loading-overlay-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
