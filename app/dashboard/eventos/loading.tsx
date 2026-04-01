const Bone = ({ w = "100%", h = 14, radius = 6 }: { w?: string | number; h?: number; radius?: number }) => (
  <div style={{ width: w, height: h, borderRadius: radius, background: "var(--bg-secondary)", flexShrink: 0 }} />
);

function EventoCard() {
  return (
    <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)", display: "flex", flexDirection: "column", gap: 12 }}>
      <Bone h={120} radius={10} />
      <Bone w="65%" h={14} />
      <Bone w="45%" h={11} />
      <div style={{ display: "flex", gap: 8 }}>
        <Bone w={90} h={36} radius={8} />
        <Bone w={90} h={36} radius={8} />
      </div>
    </div>
  );
}

export default function EventosLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "clamp(16px, 4vw, 24px) 0",
        animation: "kfs-pulse 1.6s ease-in-out infinite",
      }}
    >
      {[1, 2, 3].map((i) => <EventoCard key={i} />)}
      <style>{`@keyframes kfs-pulse { 0%,100%{opacity:1} 50%{opacity:.88} }`}</style>
    </div>
  );
}
