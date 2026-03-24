export default function EscolherPlanoLoading() {
  return (
    <main className="min-h-screen p-6 bg-bg" style={{ color: "var(--text-primary)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ height: 44, maxWidth: 320, borderRadius: 8, background: "var(--bg-secondary)", marginBottom: 24 }} />
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card"
              style={{ minHeight: 200, background: "var(--bg-secondary)", opacity: 0.85 }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
