/**
 * Skeleton exibido enquanto os dados do dashboard são carregados (streaming).
 * Melhora o FCP ao permitir que o browser pinte conteúdo imediatamente.
 */
export function AdminDashboardSkeleton() {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, height: 40 }}>
        <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Escola:</span>
        <div style={{ height: 36, width: 180, backgroundColor: "var(--border)", borderRadius: 6 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "clamp(10px, 2.5vw, 16px)" }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="card"
            style={{
              padding: "clamp(12px, 3vw, 18px)",
              minWidth: 0,
              minHeight: 72,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, height: 14, backgroundColor: "var(--border)", borderRadius: 4, width: "60%" }} />
            <div style={{ height: 28, backgroundColor: "var(--border)", borderRadius: 4, width: "40%" }} />
          </div>
        ))}
      </div>
      <div
        className="card"
        style={{
          padding: 24,
          color: "var(--text-secondary)",
          minHeight: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        A carregar gráficos…
      </div>
    </>
  );
}
