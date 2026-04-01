const Bone = ({ w = "100%", h = 14, radius = 6 }: { w?: string | number; h?: number; radius?: number }) => (
  <div style={{ width: w, height: h, borderRadius: radius, background: "var(--bg-secondary)", flexShrink: 0 }} />
);

function PresencaRow() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Bone w={120} h={12} />
        <Bone w={80} h={10} />
      </div>
      <Bone w={60} h={26} radius={999} />
    </div>
  );
}

export default function HistoricoLoading() {
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
      {/* Filtro */}
      <div className="card" style={{ padding: "clamp(14px, 3vw, 18px)", display: "flex", gap: 10 }}>
        <Bone h={38} radius={8} />
        <Bone w={100} h={38} radius={8} />
      </div>

      {/* Linhas de presença */}
      <div className="card" style={{ padding: "0 clamp(16px, 4vw, 20px)" }}>
        {[1, 2, 3, 4, 5, 6].map((i) => <PresencaRow key={i} />)}
      </div>

      <style>{`@keyframes kfs-pulse { 0%,100%{opacity:1} 50%{opacity:.88} }`}</style>
    </div>
  );
}
