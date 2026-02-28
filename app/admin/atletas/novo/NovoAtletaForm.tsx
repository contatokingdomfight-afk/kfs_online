"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { createAthlete, type CreateAthleteResult } from "../actions";

const LEVEL_OPTIONS = [
  { value: "INICIANTE", label: "Iniciante" },
  { value: "INTERMEDIARIO", label: "Intermediário" },
  { value: "AVANCADO", label: "Avançado" },
];

type StudentOption = { id: string; label: string };
type CoachOption = { id: string; name: string };

export function NovoAtletaForm({
  studentOptions,
  coachOptions,
}: {
  studentOptions: StudentOption[];
  coachOptions: CoachOption[];
}) {
  const [state, formAction] = useFormState(createAthlete, null as CreateAthleteResult | null);

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
          Aluno *
        </span>
        <select name="studentId" required className="input">
          <option value="">— Escolher —</option>
          {studentOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {studentOptions.length === 0 && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          Todos os alunos já são atletas. Adiciona primeiro um aluno em Admin → Alunos.
        </p>
      )}
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Coach responsável
        </span>
        <select name="mainCoachId" className="input">
          <option value="">— Nenhum —</option>
          {coachOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Nível
        </span>
        <select name="level" defaultValue="INICIANTE" className="input">
          {LEVEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
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
        <button type="submit" className="btn btn-primary" disabled={studentOptions.length === 0}>
          Criar atleta
        </button>
        <Link href="/admin/atletas" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
