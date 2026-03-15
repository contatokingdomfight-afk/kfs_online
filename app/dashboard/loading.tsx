/** Skeleton que imita a estrutura do dashboard para melhorar LCP percebido */
export default function DashboardLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      {/* NextLessonCard skeleton */}
      <section>
        <div style={{ height: 24, width: 180, backgroundColor: "var(--border)", borderRadius: 6, marginBottom: 12 }} />
        <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)", minHeight: 100 }}>
          <div style={{ height: 20, width: "70%", backgroundColor: "var(--border)", borderRadius: 4, marginBottom: 12 }} />
          <div style={{ height: 16, width: "50%", backgroundColor: "var(--border)", borderRadius: 4 }} />
        </div>
      </section>
      {/* WarriorPanel skeleton */}
      <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)", minHeight: 140 }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: "var(--border)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 18, width: 120, backgroundColor: "var(--border)", borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 14, width: 80, backgroundColor: "var(--border)", borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 40, backgroundColor: "var(--border)", borderRadius: 6 }} />
          ))}
        </div>
      </div>
      {/* WhatIsNew skeleton */}
      <div className="card" style={{ padding: 16, minHeight: 120 }}>
        <div style={{ height: 18, width: 140, backgroundColor: "var(--border)", borderRadius: 4, marginBottom: 12 }} />
        <div style={{ height: 60, backgroundColor: "var(--border)", borderRadius: 8 }} />
      </div>
    </div>
  );
}
