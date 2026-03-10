"use client";

import { useFormStatus } from "react-dom";

type Props = {
  message?: string;
};

/**
 * Mostra um modal de carregamento quando o formulário pai está a ser submetido.
 * Deve ser colocado dentro do <form> para useFormStatus funcionar.
 */
export function FormLoadingModal({ message = "A guardar…" }: Props) {
  const { pending } = useFormStatus();
  if (!pending) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-live="polite"
      aria-label={message}
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
          maxWidth: 280,
          padding: "clamp(24px, 5vw, 32px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        <div
          role="progressbar"
          aria-valuetext={message}
          style={{
            width: 40,
            height: 40,
            border: "3px solid var(--border)",
            borderTopColor: "var(--primary)",
            borderRadius: "50%",
            animation: "form-loading-spin 0.8s linear infinite",
          }}
        />
        <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {message}
        </p>
        <style>{`
          @keyframes form-loading-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
