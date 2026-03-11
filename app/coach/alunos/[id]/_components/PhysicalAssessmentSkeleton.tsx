export function PhysicalAssessmentSkeleton() {
  return (
    <section
      className="card"
      style={{
        marginTop: "clamp(16px, 4vw, 20px)",
        padding: "clamp(20px, 5vw, 24px)",
      }}
    >
      <div style={{ height: 24, width: "60%", marginBottom: 12, borderRadius: 4, backgroundColor: "var(--border)" }} />
      <div style={{ height: 16, width: "90%", marginBottom: 12, borderRadius: 4, backgroundColor: "var(--border)" }} />
      <div style={{ height: 16, width: "70%", marginBottom: 16, borderRadius: 4, backgroundColor: "var(--border)" }} />
      <div style={{ height: 44, width: 200, borderRadius: "var(--radius-md)", backgroundColor: "var(--border)" }} />
    </section>
  );
}
