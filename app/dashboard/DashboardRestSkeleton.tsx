export function DashboardRestSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      <section>
        <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minHeight: 180 }} />
      </section>
      <section>
        <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minHeight: 120 }} />
      </section>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
        A carregar…
      </p>
    </div>
  );
}
