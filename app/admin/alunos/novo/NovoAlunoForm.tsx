"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { useState, useEffect } from "react";
import { createStudent, type CreateStudentResult } from "../actions";

export function NovoAlunoForm() {
  const [state, formAction] = useFormState(createStudent, null as CreateStudentResult | null);
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
        <input
          type="email"
          name="email"
          required
          className="input"
          placeholder="aluno@exemplo.com"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Nome
        </span>
        <input type="text" name="name" className="input" placeholder="Nome completo" />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Escola *
        </span>
        <select name="schoolId" required className="input" disabled={loading}>
          <option value="">Selecione uma escola</option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
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
        <Link href="/admin/alunos" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
