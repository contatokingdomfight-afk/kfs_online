/** Skeleton para página de leads */
export default function AdminLeadsLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "clamp(20px, 5vw, 28px)" }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card" style={{ padding: 16, minWidth: 140, minHeight: 60 }}>
            <div style={{ height: 14, backgroundColor: "var(--border)", borderRadius: 4, width: "60%", marginBottom: 8 }} />
            <div style={{ height: 24, backgroundColor: "var(--border)", borderRadius: 4, width: "40%" }} />
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 20, minHeight: 300 }}>
        <div style={{ height: 20, backgroundColor: "var(--border)", borderRadius: 4, width: 200, marginBottom: 16 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} style={{ height: 48, backgroundColor: "var(--border)", borderRadius: 6 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
