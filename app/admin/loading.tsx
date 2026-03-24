export default function AdminLoading() {
  return (
    <div
      className="card"
      style={{
        padding: "clamp(20px, 5vw, 28px)",
        minHeight: 240,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ height: 18, width: "40%", borderRadius: 6, background: "var(--bg-secondary)" }} />
      <div style={{ height: 160, borderRadius: "var(--radius-md)", background: "var(--bg-secondary)", opacity: 0.75 }} />
      <div style={{ height: 72, borderRadius: "var(--radius-md)", background: "var(--bg-secondary)", opacity: 0.6 }} />
    </div>
  );
}
