export function AdminMetricsDashboardSkeleton() {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "clamp(10px, 2.5vw, 16px)" }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="card"
            style={{ padding: "clamp(12px, 3vw, 18px)", minWidth: 0, minHeight: 72 }}
          >
            <div style={{ fontSize: 12, marginBottom: 8, height: 14, backgroundColor: "var(--border)", borderRadius: 4, width: "60%" }} />
            <div style={{ height: 28, backgroundColor: "var(--border)", borderRadius: 4, width: "40%" }} />
          </div>
        ))}
      </div>
      <div
        className="card"
        style={{ padding: 24, color: "var(--text-secondary)", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        A carregar métricas…
      </div>
    </>
  );
}
