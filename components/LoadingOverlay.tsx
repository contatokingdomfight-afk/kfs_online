"use client";

type Props = {
  open: boolean;
  message: string;
  /** Por omissão mostra o spinner; desativar na fase final (ex.: “a redirecionar”). */
  showSpinner?: boolean;
};

/** Overlay de carregamento (spinner + texto). Reutilizável em formulários client-side. */
export function LoadingOverlay({ open, message, showSpinner = true }: Props) {
  if (!open) return null;

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
        <style>{`
          @keyframes loading-overlay-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
