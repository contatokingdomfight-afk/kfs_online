export default function SignInLoading() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        className="card"
        style={{
          width: "min(420px, 100%)",
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ height: 22, width: "55%", borderRadius: 6, background: "var(--bg-secondary)" }} />
        <div style={{ height: 48, borderRadius: "var(--radius-md)", background: "var(--bg-secondary)", opacity: 0.8 }} />
        <div style={{ height: 48, borderRadius: "var(--radius-md)", background: "var(--bg-secondary)", opacity: 0.8 }} />
        <div style={{ height: 48, borderRadius: "var(--radius-md)", background: "var(--primary)", opacity: 0.35 }} />
      </div>
    </div>
  );
}
