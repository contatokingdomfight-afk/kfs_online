/** Skeleton para página de login - melhora LCP percebido */
export default function SignInLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        padding: 24,
        gap: 24,
      }}
    >
      <div style={{ height: 32, width: 200, backgroundColor: "var(--border)", borderRadius: 4 }} />
      <div
        className="card"
        style={{
          padding: "clamp(24px, 6vw, 32px)",
          width: "min(360px, 100%)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ height: 44, backgroundColor: "var(--border)", borderRadius: 8 }} />
        <div style={{ height: 44, backgroundColor: "var(--border)", borderRadius: 8 }} />
        <div style={{ height: 44, backgroundColor: "var(--border)", borderRadius: 8 }} />
      </div>
    </div>
  );
}
