export default function CoachAlunoDetailLoading() {
  return (
    <div
      style={{
        padding: "clamp(20px, 5vw, 28px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "40vh",
        color: "var(--text-secondary)",
        fontSize: "clamp(15px, 3.8vw, 17px)",
      }}
    >
      <p style={{ margin: 0 }}>A carregar perfil…</p>
    </div>
  );
}
