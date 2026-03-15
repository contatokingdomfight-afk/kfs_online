/** Skeleton que imita o formulário de edição aluno */
export default function AdminAlunoDetailLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "clamp(20px, 5vw, 28px)" }}>
      <div style={{ height: 28, width: 200, backgroundColor: "var(--border)", borderRadius: 4 }} />
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "grid", gap: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <div style={{ height: 14, width: 80, backgroundColor: "var(--border)", borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 40, backgroundColor: "var(--border)", borderRadius: 6 }} />
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 16, minHeight: 80 }}>
        <div style={{ height: 18, width: 140, backgroundColor: "var(--border)", borderRadius: 4, marginBottom: 12 }} />
        <div style={{ height: 44, width: 220, backgroundColor: "var(--border)", borderRadius: 6 }} />
      </div>
    </div>
  );
}
