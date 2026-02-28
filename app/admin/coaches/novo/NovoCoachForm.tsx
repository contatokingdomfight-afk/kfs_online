"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { createCoach, type CreateCoachResult } from "../actions";

export function NovoCoachForm() {
  const [state, formAction] = useFormState(createCoach, null as CreateCoachResult | null);

  return (
    <form
      action={formAction}
      className="card"
      style={{
        padding: "clamp(20px, 5vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(16px, 4vw, 20px)",
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Email *
        </span>
        <input type="email" name="email" required className="input" placeholder="coach@exemplo.com" />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Nome
        </span>
        <input type="text" name="name" className="input" placeholder="Nome completo" />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Especialidades
        </span>
        <input
          type="text"
          name="specialties"
          className="input"
          placeholder="ex: Muay Thai, Boxing"
        />
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary">
          Enviar convite
        </button>
        <Link href="/admin/coaches" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
