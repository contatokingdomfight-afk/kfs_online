export function AdminDashboardPeriodSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
      <div
        className="card"
        style={{ padding: 24, color: "var(--text-secondary)", minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        A carregar…
      </div>
    </div>
  );
}
