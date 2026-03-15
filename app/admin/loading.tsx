/** Skeleton que imita a estrutura do admin dashboard para melhorar LCP percebido */
export default function AdminLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, height: 40 }}>
        <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Escola:</span>
        <div style={{ height: 36, width: 180, backgroundColor: "var(--border)", borderRadius: 6 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "clamp(10px, 2.5vw, 16px)" }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card" style={{ padding: "clamp(12px, 3vw, 18px)", minHeight: 72 }}>
            <div style={{ height: 14, backgroundColor: "var(--border)", borderRadius: 4, width: "60%", marginBottom: 8 }} />
            <div style={{ height: 28, backgroundColor: "var(--border)", borderRadius: 4, width: "40%" }} />
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 24, minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        A carregar gráficos…
      </div>
    </div>
  );
}
