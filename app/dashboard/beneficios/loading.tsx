const Bone = ({ w = "100%", h = 14, radius = 6 }: { w?: string | number; h?: number; radius?: number }) => (
  <div style={{ width: w, height: h, borderRadius: radius, background: "var(--bg-secondary)", flexShrink: 0 }} />
);

export default function BeneficiosLoading() {
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
      <Bone w="45%" h={18} />
      <Bone w="75%" h={13} />
      {[1, 2, 3].map((i) => (
        <div key={i} className="card" style={{ padding: "clamp(14px, 3vw, 18px)", display: "flex", gap: 12, alignItems: "center" }}>
          <Bone w={40} h={40} radius={8} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <Bone w="60%" h={12} />
            <Bone w="80%" h={10} />
          </div>
        </div>
      ))}
      <style>{`@keyframes kfs-pulse { 0%,100%{opacity:1} 50%{opacity:.88} }`}</style>
    </div>
  );
}
