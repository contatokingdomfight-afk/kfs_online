export default function CoachDetailLoading() {
  return (
    <div style={{ maxWidth: "min(700px, 100%)", paddingTop: "clamp(24px, 6vw, 40px)" }}>
      <div
        className="card"
        style={{
          padding: "clamp(28px, 7vw, 40px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          textAlign: "center",
        }}
        aria-busy="true"
        aria-live="polite"
      >
        <div
          role="progressbar"
          aria-valuetext="A carregar ficha do coach"
          style={{
            width: 44,
            height: 44,
            border: "3px solid var(--border)",
            borderTopColor: "var(--primary)",
            borderRadius: "50%",
            animation: "coach-detail-loading-spin 0.85s linear infinite",
          }}
        />
        <p style={{ margin: 0, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          A abrir dados do coach…
        </p>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", maxWidth: 360 }}>
          Aguarda um momento enquanto carregamos a ficha.
        </p>
        <style>{`
          @keyframes coach-detail-loading-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
