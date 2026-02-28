"use client";

import { setViewAsCookieValue } from "@/lib/view-as";

export function ViewAsSwitcher() {
  function viewAs(role: "aluno" | "coach") {
    document.cookie = setViewAsCookieValue(role);
    if (role === "aluno") window.location.href = "/dashboard";
    else window.location.href = "/coach";
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Ver como:</span>
      <button
        type="button"
        onClick={() => viewAs("aluno")}
        style={{
          padding: "6px 10px",
          fontSize: 12,
          fontWeight: 500,
          border: "1px solid var(--border)",
          borderRadius: 6,
          cursor: "pointer",
          backgroundColor: "var(--bg)",
          color: "var(--text-primary)",
        }}
      >
        Aluno
      </button>
      <button
        type="button"
        onClick={() => viewAs("coach")}
        style={{
          padding: "6px 10px",
          fontSize: 12,
          fontWeight: 500,
          border: "1px solid var(--border)",
          borderRadius: 6,
          cursor: "pointer",
          backgroundColor: "var(--bg)",
          color: "var(--text-primary)",
        }}
      >
        Professor
      </button>
    </div>
  );
}
