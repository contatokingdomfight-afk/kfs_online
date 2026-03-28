"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { useState, useEffect } from "react";
import { createCoach, type CreateCoachResult } from "../actions";

export function NovoCoachForm() {
  const [state, formAction] = useFormState(createCoach, null as CreateCoachResult | null);
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchools() {
      try {
        const response = await fetch("/api/schools");
        if (response.ok) {
          const data = await response.json();
          setSchools(data.schools || []);
        }
      } catch (error) {
        console.error("Error loading schools:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSchools();
  }, []);

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
      <fieldset style={{ border: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <legend style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
          Escolas onde leciona * (uma ou mais)
        </legend>
        {loading ? (
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>A carregar escolas…</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {schools.map((school) => (
              <li key={school.id}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" name="schoolIds" value={school.id} style={{ width: 18, height: 18, accentColor: "var(--primary)" }} />
                  <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>{school.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          O perfil de aluno (se ativares abaixo) usa a primeira escola que marcares.
        </span>
      </fieldset>
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
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <input
          type="checkbox"
          name="createStudentProfile"
          value="true"
          style={{ width: 20, height: 20, cursor: "pointer" }}
        />
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
          Este coach também é aluno (criar perfil de aluno)
        </span>
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
