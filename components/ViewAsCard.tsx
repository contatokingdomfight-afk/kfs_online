"use client";

import { setViewAsCookieValue } from "@/lib/view-as";

export function ViewAsCard() {
  function viewAs(role: "aluno" | "coach") {
    document.cookie = setViewAsCookieValue(role);
    if (role === "aluno") window.location.href = "/dashboard";
    else window.location.href = "/coach";
  }

  return (
    <section
      style={{
        padding: 20,
        marginBottom: 24,
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 12,
      }}
    >
      <h2 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
        Ver vista como
      </h2>
      <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "var(--text-secondary)" }}>
        Abre o dashboard ou a área do professor com a tua sessão de admin (depois podes voltar ao Admin).
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button
          type="button"
          onClick={() => viewAs("aluno")}
          style={{
            padding: "12px 20px",
            fontSize: 14,
            fontWeight: 500,
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            backgroundColor: "var(--primary)",
            color: "#fff",
          }}
        >
          Ver como Aluno
        </button>
        <button
          type="button"
          onClick={() => viewAs("coach")}
          style={{
            padding: "12px 20px",
            fontSize: 14,
            fontWeight: 500,
            border: "1px solid var(--border)",
            borderRadius: 8,
            cursor: "pointer",
            backgroundColor: "var(--bg)",
            color: "var(--text-primary)",
          }}
        >
          Ver como Professor
        </button>
      </div>
    </section>
  );
}
