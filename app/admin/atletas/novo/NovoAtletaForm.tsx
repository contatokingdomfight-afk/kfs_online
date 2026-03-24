"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useFormState } from "react-dom";
import {
  createAthlete,
  searchStudentsForNewAthlete,
  type CreateAthleteResult,
  type StudentSummaryRow,
} from "../actions";

const LEVEL_OPTIONS = [
  { value: "INICIANTE", label: "Iniciante" },
  { value: "INTERMEDIARIO", label: "Intermediário" },
  { value: "AVANCADO", label: "Avançado" },
];

type CoachOption = { id: string; name: string };

export function NovoAtletaForm({ coachOptions }: { coachOptions: CoachOption[] }) {
  const [state, formAction] = useFormState(createAthlete, null as CreateAthleteResult | null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<StudentSummaryRow[]>([]);
  const [selected, setSelected] = useState<StudentSummaryRow | null>(null);

  const openForm = useCallback((row: StudentSummaryRow) => {
    setSelected(row);
    setSearchError(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(null);
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    setResults([]);
    setSearching(true);
    try {
      const res = await searchStudentsForNewAthlete(query);
      if ("error" in res) {
        setSearchError(res.error);
        setResults([]);
      } else {
        setResults(res.results);
        if (res.results.length === 0) {
          setSearchError(
            "Nenhum aluno elegível. Ou não há correspondência, ou os alunos encontrados já são atletas. Confirma a pesquisa ou adiciona o aluno em Admin → Alunos."
          );
        } else {
          setSearchError(null);
        }
      }
    } finally {
      setSearching(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      {!selected && (
        <div
          className="card"
          style={{
            padding: "clamp(20px, 5vw, 24px)",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(14px, 3.5vw, 18px)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(16px, 4vw, 18px)",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Pesquisar aluno
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Nome, email ou telefone (mínimo 2 caracteres). Só aparecem alunos que ainda <strong>não</strong> têm perfil de
            atleta.
          </p>
          <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input"
              placeholder="Ex.: João, joao@… ou 912…"
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary" disabled={searching || query.trim().length < 2}>
              {searching ? "A pesquisar…" : "Pesquisar"}
            </button>
          </form>
          {searchError && <p style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>{searchError}</p>}
          {results.length > 0 && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {results.map((r) => (
                <li
                  key={r.studentId}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 14px",
                    background: "var(--surface)",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>
                    {r.name || "—"} <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>{r.email}</span>
                  </div>
                  {r.phone && (
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>Tel. {r.phone}</div>
                  )}
                  {r.planName && (
                    <div style={{ fontSize: 13, marginTop: 6, color: "var(--text-secondary)" }}>
                      Plano: <strong style={{ color: "var(--text-primary)" }}>{r.planName}</strong>
                    </div>
                  )}
                  <button type="button" className="btn btn-primary" style={{ marginTop: 10, fontSize: 14 }} onClick={() => openForm(r)}>
                    Selecionar este aluno
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selected && (
        <div
          className="card"
          style={{
            padding: "clamp(20px, 5vw, 24px)",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(16px, 4vw, 20px)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
              Novo atleta
            </h2>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 14 }} onClick={clearSelection}>
              ← Escolher outro aluno
            </button>
          </div>
          <div
            style={{
              fontSize: 13,
              padding: "10px 12px",
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
              borderLeft: "3px solid var(--primary)",
            }}
          >
            <div>
              <strong>{selected.name || "—"}</strong> {selected.email && <span style={{ color: "var(--text-secondary)" }}>{selected.email}</span>}
            </div>
            {selected.phone && <div style={{ color: "var(--text-secondary)", marginTop: 4 }}>Tel. {selected.phone}</div>}
            {selected.planName && (
              <div style={{ marginTop: 6, color: "var(--text-secondary)" }}>
                Plano: <strong style={{ color: "var(--text-primary)" }}>{selected.planName}</strong>
              </div>
            )}
          </div>

          <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
            <input type="hidden" name="studentId" value={selected.studentId} />
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
              <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>{state.error}</p>
            )}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-primary">
                Criar atleta
              </button>
              <Link href="/admin/atletas" className="btn btn-secondary" style={{ textDecoration: "none" }}>
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
