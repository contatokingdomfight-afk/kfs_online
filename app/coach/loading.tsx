/** Skeleton que imita a estrutura do coach dashboard para melhorar LCP percebido */
export default function CoachLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)", maxWidth: "min(520px, 100%)" }}>
      <div style={{ height: 24, width: 200, backgroundColor: "var(--border)", borderRadius: 4 }} />
      <div className="card" style={{ padding: 20, minHeight: 100 }}>
        <div style={{ height: 20, width: "60%", backgroundColor: "var(--border)", borderRadius: 4, marginBottom: 12 }} />
        <div style={{ height: 16, width: "40%", backgroundColor: "var(--border)", borderRadius: 4 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "clamp(12px, 3vw, 16px)" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="card" style={{ padding: 16, minHeight: 80 }}>
            <div style={{ height: 16, backgroundColor: "var(--border)", borderRadius: 4, width: "70%", marginBottom: 12 }} />
            <div style={{ height: 40, backgroundColor: "var(--border)", borderRadius: 6 }} />
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 16, minHeight: 120 }}>
        <div style={{ height: 18, width: 160, backgroundColor: "var(--border)", borderRadius: 4, marginBottom: 12 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 36, backgroundColor: "var(--border)", borderRadius: 6 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
