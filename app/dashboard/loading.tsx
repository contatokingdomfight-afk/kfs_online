export default function DashboardLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 280,
        gap: 16,
      }}
    >
      <div
        role="progressbar"
        aria-valuetext="A carregar…"
        style={{
          width: 48,
          height: 48,
          border: "3px solid var(--border)",
          borderTopColor: "var(--primary)",
          borderRadius: "50%",
          animation: "dashboard-loading-spin 0.8s linear infinite",
        }}
      />
      <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)", fontWeight: 500 }}>
        A carregar…
      </p>
      <div
        style={{
          width: "min(200px, 80%)",
          height: 4,
          borderRadius: 2,
          backgroundColor: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "40%",
            backgroundColor: "var(--primary)",
            animation: "dashboard-loading-bar 1.2s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes dashboard-loading-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes dashboard-loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
