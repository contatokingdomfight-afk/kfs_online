"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { createFamilyGroup, searchStudentsForFamily, type FamilyActionResult } from "../actions";

type SchoolOption = { id: string; name: string };

type Props = {
  schools: SchoolOption[];
};

export function NovaFamiliaForm({ schools }: Props) {
  const [state, formAction] = useFormState(createFamilyGroup, null as FamilyActionResult | null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ studentId: string; name: string; email: string }>>([]);
  const [titular, setTitular] = useState<{ studentId: string; name: string } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pendingSearch, startSearch] = useTransition();

  function runSearch() {
    startSearch(async () => {
      setSearchError(null);
      const res = await searchStudentsForFamily(query);
      if ("error" in res) {
        setSearchError(res.error);
        setResults([]);
        return;
      }
      setResults(res.results);
    });
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {state?.error && (
        <p style={{ color: "var(--danger)", margin: 0, fontSize: 14 }}>{state.error}</p>
      )}

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Nome do grupo (opcional)</span>
        <input type="text" name="name" className="input" placeholder="Ex.: Família Silva" />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Escola</span>
        <select name="schoolId" className="input" required defaultValue={schools[0]?.id ?? ""}>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Limite de membros</span>
        <input type="number" name="maxMembers" className="input" min={2} max={20} defaultValue={3} required />
      </label>

      <div>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Titular (quem paga a mensalidade)</span>
        <input type="hidden" name="titularStudentId" value={titular?.studentId ?? ""} />
        {titular ? (
          <p style={{ margin: "8px 0", fontSize: 14 }}>
            {titular.name}{" "}
            <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 8px" }} onClick={() => setTitular(null)}>
              Alterar
            </button>
          </p>
        ) : (
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="search"
              className="input"
              style={{ flex: 1, minWidth: 180 }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, email ou telefone"
            />
            <button type="button" className="btn btn-secondary" onClick={runSearch} disabled={pendingSearch}>
              {pendingSearch ? "…" : "Pesquisar"}
            </button>
          </div>
        )}
        {searchError && <p style={{ color: "var(--danger)", fontSize: 13 }}>{searchError}</p>}
        {results.length > 0 && !titular && (
          <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
            {results.map((r) => (
              <li key={r.studentId}>
                <button
                  type="button"
                  className="card"
                  style={{ width: "100%", textAlign: "left", padding: 10, cursor: "pointer" }}
                  onClick={() => {
                    setTitular({ studentId: r.studentId, name: r.name });
                    setResults([]);
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{r.name}</span>
                  {r.email && <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)" }}>{r.email}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="submit" className="btn btn-primary" disabled={!titular}>
        Criar grupo familiar
      </button>
    </form>
  );
}
