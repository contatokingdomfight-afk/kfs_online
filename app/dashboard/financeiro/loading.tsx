const Bone = ({ w = "100%", h = 14, radius = 6 }: { w?: string | number; h?: number; radius?: number }) => (
  <div style={{ width: w, height: h, borderRadius: radius, background: "var(--bg-secondary)", flexShrink: 0 }} />
);

function PagamentoRow() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Bone w={130} h={12} />
        <Bone w={80} h={10} />
      </div>
      <Bone w={70} h={26} radius={999} />
    </div>
  );
}

export default function FinanceiroLoading() {
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
      {/* Resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[1, 2].map((i) => (
          <div key={i} className="card" style={{ padding: "clamp(14px, 3vw, 18px)", display: "flex", flexDirection: "column", gap: 10 }}>
            <Bone w="55%" h={11} />
            <Bone w="70%" h={22} />
          </div>
        ))}
      </div>

      {/* Lista de pagamentos */}
      <div className="card" style={{ padding: "0 clamp(16px, 4vw, 20px)" }}>
        {[1, 2, 3, 4].map((i) => <PagamentoRow key={i} />)}
      </div>

      <style>{`@keyframes kfs-pulse { 0%,100%{opacity:1} 50%{opacity:.88} }`}</style>
    </div>
  );
}
