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
      <div
        className="card"
        style={{
          padding: 24,
          color: "var(--text-secondary)",
          minHeight: 160,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        A carregar…
      </div>
    </>
  );
}
