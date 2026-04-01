const Bone = ({ w = "100%", h = 16, radius = 6 }: { w?: string | number; h?: number; radius?: number }) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: radius,
      background: "var(--bg-secondary)",
      flexShrink: 0,
    }}
  />
);

export default function DashboardLoading() {
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
      {/* Próxima aula */}
      <div
        className="card"
        style={{ padding: "clamp(16px, 4vw, 20px)", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <Bone w="38%" h={13} />
        <Bone h={72} radius={10} />
        <Bone w="55%" h={38} radius={10} />
      </div>

      {/* Carrossel de aulas abertas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Bone w="42%" h={13} />
        <div style={{ display: "flex", gap: 12, overflow: "hidden" }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              className="card"
              style={{
                minWidth: 220,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flexShrink: 0,
              }}
            >
              <Bone w="60%" h={11} />
              <Bone h={48} radius={8} />
              <Bone w="80%" h={11} />
            </div>
          ))}
        </div>
      </div>

      {/* Painel do guerreiro */}
      <div
        className="card"
        style={{ padding: "clamp(16px, 4vw, 20px)", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <Bone w="34%" h={13} />
        <div style={{ display: "flex", gap: 12 }}>
          <Bone w={60} h={60} radius={999} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
            <Bone w="70%" h={12} />
            <Bone w="50%" h={10} />
          </div>
        </div>
        <Bone h={10} radius={999} />
      </div>

      <style>{`
        @keyframes kfs-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.88; }
        }
      `}</style>
    </div>
  );
}
