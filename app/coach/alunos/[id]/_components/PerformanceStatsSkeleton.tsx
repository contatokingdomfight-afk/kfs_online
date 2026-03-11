export function PerformanceStatsSkeleton() {
  return (
    <section
      className="card"
      style={{
        marginTop: "clamp(24px, 6vw, 32px)",
        padding: "clamp(20px, 5vw, 24px)",
      }}
    >
      <div style={{ height: 24, width: "70%", marginBottom: 12, borderRadius: 4, backgroundColor: "var(--border)" }} />
      <div style={{ height: 16, width: "50%", marginBottom: 16, borderRadius: 4, backgroundColor: "var(--border)" }} />
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: "50%",
          backgroundColor: "var(--surface)",
          marginBottom: 16,
        }}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ height: 40, width: 140, borderRadius: "var(--radius-md)", backgroundColor: "var(--border)" }} />
        <div style={{ height: 40, width: 180, borderRadius: "var(--radius-md)", backgroundColor: "var(--border)" }} />
      </div>
    </section>
  );
}
