const Bone = ({ w = "100%", h = 14, radius = 6 }: { w?: string | number; h?: number; radius?: number }) => (
  <div style={{ width: w, height: h, borderRadius: radius, background: "var(--bg-secondary)", flexShrink: 0 }} />
);

function NotifRow() {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
      <Bone w={36} h={36} radius={999} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <Bone w="70%" h={12} />
        <Bone w="50%" h={10} />
      </div>
    </div>
  );
}

export default function NotificacoesLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        padding: "clamp(16px, 4vw, 24px) 0",
        animation: "kfs-pulse 1.6s ease-in-out infinite",
      }}
    >
      <div className="card" style={{ padding: "0 clamp(16px, 4vw, 20px)" }}>
        {[1, 2, 3, 4, 5].map((i) => <NotifRow key={i} />)}
      </div>
      <style>{`@keyframes kfs-pulse { 0%,100%{opacity:1} 50%{opacity:.88} }`}</style>
    </div>
  );
}
