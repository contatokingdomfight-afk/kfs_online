export function CoachNotesSkeleton() {
  return (
    <section
      className="card"
      style={{
        marginTop: "clamp(16px, 4vw, 20px)",
        padding: "clamp(20px, 5vw, 24px)",
        borderLeft: "4px solid var(--border)",
      }}
    >
      <div style={{ height: 24, width: "55%", marginBottom: 12, borderRadius: 4, backgroundColor: "var(--border)" }} />
      <div style={{ height: 14, width: "30%", marginBottom: 8, borderRadius: 4, backgroundColor: "var(--border)" }} />
      <div style={{ height: 16, width: "100%", marginBottom: 8, borderRadius: 4, backgroundColor: "var(--border)" }} />
      <div style={{ height: 16, width: "85%", borderRadius: 4, backgroundColor: "var(--border)" }} />
    </section>
  );
}
