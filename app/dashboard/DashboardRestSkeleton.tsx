export function DashboardRestSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      <section>
        <div
          style={{
            height: 4,
            width: "40%",
            marginBottom: 12,
            borderRadius: 2,
            backgroundColor: "var(--border)",
          }}
        />
        <div
          className="card"
          style={{
            padding: "clamp(16px, 4vw, 20px)",
            minHeight: 180,
            backgroundColor: "var(--surface)",
          }}
        />
      </section>
      <section>
        <div
          style={{
            height: 4,
            width: "30%",
            marginBottom: 12,
            borderRadius: 2,
            backgroundColor: "var(--border)",
          }}
        />
        <div
          className="card"
          style={{
            padding: "clamp(16px, 4vw, 20px)",
            minHeight: 200,
            backgroundColor: "var(--surface)",
          }}
        />
      </section>
      <section>
        <div
          style={{
            height: 4,
            width: "35%",
            marginBottom: 12,
            borderRadius: 2,
            backgroundColor: "var(--border)",
          }}
        />
        <div
          className="card"
          style={{
            padding: "clamp(16px, 4vw, 20px)",
            minHeight: 120,
            backgroundColor: "var(--surface)",
          }}
        />
      </section>
    </div>
  );
}
