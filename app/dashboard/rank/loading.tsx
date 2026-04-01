const Bone = ({ w = "100%", h = 14, radius = 6 }: { w?: string | number; h?: number; radius?: number }) => (
  <div style={{ width: w, height: h, borderRadius: radius, background: "var(--bg-secondary)", flexShrink: 0 }} />
);

function Row() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <Bone w={32} h={14} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <Bone w="55%" h={12} />
        <Bone w="35%" h={10} />
      </div>
      <Bone w={48} h={14} />
    </div>
  );
}

export default function RankLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "clamp(16px, 4vw, 24px) 0",
        animation: "kfs-pulse 1.6s ease-in-out infinite",
      }}
    >
      <Bone w="40%" h={22} />
      <Bone w="75%" h={14} />
      <div className="card" style={{ padding: "0 clamp(12px, 3vw, 16px)", marginTop: 12 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Row key={i} />
        ))}
      </div>
      <style>{`@keyframes kfs-pulse { 0%,100%{opacity:1} 50%{opacity:.88} }`}</style>
    </div>
  );
}
