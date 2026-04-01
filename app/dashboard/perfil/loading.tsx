const Bone = ({ w = "100%", h = 14, radius = 6 }: { w?: string | number; h?: number; radius?: number }) => (
  <div style={{ width: w, height: h, borderRadius: radius, background: "var(--bg-secondary)", flexShrink: 0 }} />
);

export default function PerfilLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: "clamp(16px, 4vw, 24px) 0",
        animation: "kfs-pulse 1.6s ease-in-out infinite",
      }}
    >
      {/* Avatar */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Bone w={88} h={88} radius={999} />
        <Bone w="36%" h={12} />
      </div>

      {/* Campos de formulário */}
      <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)", display: "flex", flexDirection: "column", gap: 14 }}>
        <Bone w="28%" h={12} />
        <Bone h={44} radius={8} />
        <Bone w="28%" h={12} />
        <Bone h={44} radius={8} />
        <Bone w="28%" h={12} />
        <Bone h={44} radius={8} />
        <Bone w="45%" h={44} radius={8} />
      </div>

      <style>{`@keyframes kfs-pulse { 0%,100%{opacity:1} 50%{opacity:.88} }`}</style>
    </div>
  );
}
