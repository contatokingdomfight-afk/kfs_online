const Bone = ({ w = "100%", h = 14, radius = 6 }: { w?: string | number; h?: number; radius?: number }) => (
  <div style={{ width: w, height: h, borderRadius: radius, background: "var(--bg-secondary)", flexShrink: 0 }} />
);

export default function LojaLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        minHeight: "40vh",
        padding: "clamp(24px, 6vw, 40px) 0",
        animation: "kfs-pulse 1.6s ease-in-out infinite",
      }}
    >
      <Bone w={56} h={56} radius={12} />
      <Bone w="50%" h={18} />
      <Bone w="70%" h={13} />
      <Bone w="38%" h={44} radius={8} />
      <style>{`@keyframes kfs-pulse { 0%,100%{opacity:1} 50%{opacity:.88} }`}</style>
    </div>
  );
}
