const Bone = ({ w = "100%", h = 14, radius = 6 }: { w?: string | number; h?: number; radius?: number }) => (
  <div style={{ width: w, height: h, borderRadius: radius, background: "var(--bg-secondary)", flexShrink: 0 }} />
);

function BadgeCard() {
  return (
    <div
      className="card"
      style={{
        padding: "clamp(12px, 3vw, 16px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      <Bone w={56} h={56} radius={12} />
      <Bone w="75%" h={10} />
      <Bone w="55%" h={9} />
    </div>
  );
}

export default function ConquistasLoading() {
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
      <Bone w="40%" h={13} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => <BadgeCard key={i} />)}
      </div>
      <style>{`@keyframes kfs-pulse { 0%,100%{opacity:1} 50%{opacity:.88} }`}</style>
    </div>
  );
}
