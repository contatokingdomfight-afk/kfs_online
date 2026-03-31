export default function AdminTurmaEditarLoading() {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-live="polite"
      aria-label="A abrir edição"
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
          aria-valuetext="A abrir edição"
          style={{
            width: 40,
            height: 40,
            border: "3px solid var(--border)",
            borderTopColor: "var(--primary)",
            borderRadius: "50%",
            animation: "turmas-edit-loading-spin 0.8s linear infinite",
          }}
        />
        <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 500, color: "var(--text-primary)" }}>
          A abrir edição…
        </p>
        <style>{`
          @keyframes turmas-edit-loading-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
