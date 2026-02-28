"use client";

import { setViewAsCookieValue } from "@/lib/view-as";

type Props = { viewAs: "aluno" | "coach" };

export function ViewAsBanner({ viewAs }: Props) {
  function clearAndGoAdmin() {
    document.cookie = setViewAsCookieValue("");
    window.location.href = "/admin";
  }

  const label = viewAs === "aluno" ? "Aluno" : "Professor";

  return (
    <div
      style={{
        padding: "8px 16px",
        backgroundColor: "var(--primary)",
        color: "#fff",
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      <span>A ver como {label}.</span>
      <button
        type="button"
        onClick={clearAndGoAdmin}
        style={{
          padding: "4px 12px",
          fontSize: 12,
          fontWeight: 500,
          border: "1px solid rgba(255,255,255,0.8)",
          borderRadius: 6,
          cursor: "pointer",
          backgroundColor: "transparent",
          color: "#fff",
        }}
      >
        Voltar ao Admin
      </button>
    </div>
  );
}
