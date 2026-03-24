export default function DashboardLoading() {
  return (
    <div
      className="card"
      style={{
        padding: "clamp(20px, 5vw, 28px)",
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    >
      <div
        style={{
          height: 14,
          width: "45%",
          borderRadius: 6,
          background: "var(--bg-secondary)",
          opacity: 0.85,
        }}
      />
      <div
        style={{
          height: 120,
          borderRadius: "var(--radius-md)",
          background: "var(--bg-secondary)",
          opacity: 0.7,
        }}
      />
      <div
        style={{
          height: 80,
          borderRadius: "var(--radius-md)",
          background: "var(--bg-secondary)",
          opacity: 0.55,
        }}
      />
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.92 } }`}</style>
    </div>
  );
}
