"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import {
  addFamilyMember,
  removeFamilyMember,
  deactivateFamilyGroup,
  searchStudentsForFamily,
  type FamilyActionResult,
} from "../actions";
import type { FamilyGroupDetail } from "@/lib/family-group";

type Props = {
  detail: FamilyGroupDetail;
};

export function FamiliaDetailClient({ detail }: Props) {
  const [addState, addAction] = useFormState(addFamilyMember, null as FamilyActionResult | null);
  const [removeState, removeAction] = useFormState(removeFamilyMember, null as FamilyActionResult | null);
  const [deactState, deactAction] = useFormState(deactivateFamilyGroup, null as FamilyActionResult | null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ studentId: string; name: string; email: string }>>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pendingSearch, startSearch] = useTransition();

  const { group, members } = detail;
  const canAdd = group.isActive && members.length < group.maxMembers;

  function runSearch() {
    startSearch(async () => {
      setSearchError(null);
      const res = await searchStudentsForFamily(query);
      if ("error" in res) {
        setSearchError(res.error);
        setResults([]);
        return;
      }
      const memberIds = new Set(members.map((m) => m.studentId));
      setResults(res.results.filter((r) => !memberIds.has(r.studentId)));
    });
  }

  const errorMsg = addState?.error || removeState?.error || deactState?.error;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {errorMsg && <p style={{ color: "var(--danger)", margin: 0 }}>{errorMsg}</p>}

      <div className="card" style={{ padding: 14 }}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
          {members.length}/{group.maxMembers} membros ·{" "}
          {group.isActive ? "Activo" : "Inactivo"}
        </p>
      </div>

      <section>
        <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 10px" }}>Membros</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {members.map((m) => (
            <li key={m.id} className="card" style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <Link href={`/admin/alunos/${m.studentId}`} style={{ fontWeight: 600, color: "var(--primary)" }}>
                  {m.name}
                </Link>
                <span style={{ marginLeft: 8, fontSize: 12, padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.08)" }}>
                  {m.role === "TITULAR" ? "Titular" : "Membro"}
                </span>
                {m.email && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{m.email}</p>}
              </div>
              {m.role === "MEMBER" && group.isActive && (
                <form action={removeAction}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="studentId" value={m.studentId} />
                  <button type="submit" className="btn btn-secondary" style={{ fontSize: 13 }}>
                    Remover
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      {canAdd && (
        <section className="card" style={{ padding: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 12px" }}>Adicionar membro</h2>
          <form action={addAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="hidden" name="groupId" value={group.id} />
            <input type="hidden" name="studentId" value={selectedStudentId} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="search"
                className="input"
                style={{ flex: 1, minWidth: 180 }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar aluno"
              />
              <button type="button" className="btn btn-secondary" onClick={runSearch} disabled={pendingSearch}>
                Pesquisar
              </button>
            </div>
            {searchError && <p style={{ color: "var(--danger)", fontSize: 13, margin: 0 }}>{searchError}</p>}
            {results.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {results.map((r) => (
                  <li key={r.studentId}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="pick"
                        checked={selectedStudentId === r.studentId}
                        onChange={() => setSelectedStudentId(r.studentId)}
                      />
                      {r.name} {r.email ? `(${r.email})` : ""}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <button type="submit" className="btn btn-primary" disabled={!selectedStudentId}>
              Adicionar ao grupo
            </button>
          </form>
        </section>
      )}

      {group.isActive && (
        <form action={deactAction}>
          <input type="hidden" name="groupId" value={group.id} />
          <button type="submit" className="btn btn-secondary" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
            Desactivar grupo
          </button>
        </form>
      )}
    </div>
  );
}
