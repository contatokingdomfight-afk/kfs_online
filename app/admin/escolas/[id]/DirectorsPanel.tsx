"use client";

import { useActionState, useEffect, useState } from "react";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import {
  inviteDirector,
  nominateDirector,
  removeDirector,
  resendDirectorInvite,
  searchDirectorCandidates,
  type DirectorCandidate,
  type SchoolResult,
} from "../actions";

export type DirectorRow = { userId: string; name: string | null; email: string; since: string; pending: boolean };

const ROLE_LABEL: Record<DirectorCandidate["role"], string> = { ALUNO: "Aluno", COACH: "Coach", ADMIN: "Diretor" };

function Feedback({ state }: { state: SchoolResult }) {
  if (state?.error) return <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)", margin: 0 }}>{state.error}</p>;
  if (state?.success) return <p style={{ color: "var(--success)", fontSize: "var(--text-sm)", margin: 0 }}>{state.success}</p>;
  return null;
}

function nominationWarning(candidate: DirectorCandidate, schoolName: string): string {
  const name = candidate.name ?? candidate.email;
  if (candidate.role === "ALUNO") {
    return `${name} é aluno. Passa a ver tudo de ${schoolName} (alunos, financeiro, relatórios e equipa) e deixa de aparecer no ranking enquanto for diretor.`;
  }
  if (candidate.role === "COACH") {
    return `${name} continua a dar as suas aulas e passa a ver tudo de ${schoolName}: alunos, financeiro, relatórios e equipa. Na área de coach fica limitado às escolas de que é diretor.`;
  }
  return `${name} passa a ver também tudo de ${schoolName}: alunos, financeiro, relatórios e equipa.`;
}

function NominateModal({ schoolId, schoolName, onClose }: { schoolId: string; schoolName: string; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectorCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<DirectorCandidate | null>(null);
  const [inviting, setInviting] = useState(false);
  const [nominateState, nominateAction] = useActionState(nominateDirector, null as SchoolResult);
  const [inviteState, inviteAction] = useActionState(inviteDirector, null as SchoolResult);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const found = await searchDirectorCandidates(schoolId, query);
      if (cancelled) return;
      setResults(found);
      setSearching(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, schoolId]);

  useEffect(() => {
    if (nominateState?.success || inviteState?.success) onClose();
  }, [nominateState, inviteState, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nomear diretor técnico"
      style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div className="card" style={{ width: 440, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>Nomear diretor técnico</h2>
          <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{schoolName}</p>
        </div>

        {inviting ? (
          <form action={inviteAction} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <input type="hidden" name="schoolId" value={schoolId} />
            <input name="name" placeholder="Nome" className="input" style={{ fontSize: "var(--text-sm)" }} />
            <input name="email" type="email" required placeholder="Email *" className="input" style={{ fontSize: "var(--text-sm)" }} />
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
              A pessoa recebe um link por email. Ao entrar pela 1.ª vez, já é diretor de {schoolName}.
            </p>
            <Feedback state={inviteState} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
              <button type="button" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }} onClick={() => setInviting(false)}>
                Voltar
              </button>
              <button type="submit" className="btn btn-primary" style={{ fontSize: "var(--text-sm)" }}>
                Enviar convite
              </button>
            </div>
            <FormLoadingModal message="A enviar convite…" />
          </form>
        ) : (
          <form action={nominateAction} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <input type="hidden" name="schoolId" value={schoolId} />
            <input type="hidden" name="userId" value={selected?.userId ?? ""} />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              placeholder="Nome ou email"
              aria-label="Pesquisar por nome ou email"
              autoFocus
              className="input"
              style={{ fontSize: "var(--text-sm)" }}
            />
            {results.map((candidate) => (
              <button
                key={candidate.userId}
                type="button"
                onClick={() => setSelected(candidate)}
                aria-pressed={selected?.userId === candidate.userId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: "var(--radius-md)",
                  background: "transparent",
                  color: "var(--text-primary)",
                  border: `1px solid ${selected?.userId === candidate.userId ? "var(--primary)" : "var(--border)"}`,
                }}
              >
                <span style={{ minWidth: 0, fontSize: "var(--text-sm)", overflowWrap: "anywhere" }}>
                  {candidate.name ?? candidate.email}
                  <small style={{ display: "block", color: "var(--text-secondary)" }}>{candidate.email}</small>
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", flexShrink: 0 }}>
                  {[ROLE_LABEL[candidate.role], candidate.schoolName].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))}
            {query.trim().length >= 2 && !searching && results.length === 0 && (
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Nenhuma conta encontrada.</p>
            )}
            {selected && (
              <p style={{ margin: 0, fontSize: "var(--text-xs)", lineHeight: 1.5, color: "var(--warning)", border: "1px solid var(--warning)", borderRadius: "var(--radius-md)", padding: "8px 10px" }}>
                {nominationWarning(selected, schoolName)}
              </p>
            )}
            <button type="button" onClick={() => setInviting(true)} style={{ alignSelf: "flex-start", padding: 0, background: "none", border: 0, cursor: "pointer", color: "var(--primary)", fontSize: "var(--text-sm)" }}>
              Não encontras? Convidar por email
            </button>
            <Feedback state={nominateState} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
              <button type="button" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }} onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" style={{ fontSize: "var(--text-sm)" }} disabled={!selected}>
                Nomear
              </button>
            </div>
            <FormLoadingModal message="A nomear diretor…" />
          </form>
        )}
      </div>
    </div>
  );
}

function DirectorItem({ schoolId, director }: { schoolId: string; director: DirectorRow }) {
  const [removeState, removeAction] = useActionState(removeDirector, null as SchoolResult);
  const [resendState, resendAction] = useActionState(resendDirectorInvite, null as SchoolResult);
  const label = director.name ?? director.email;

  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 200px" }}>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
            {label}
            {director.pending && <span style={{ marginLeft: 8, fontSize: "var(--text-xs)", color: "var(--warning)" }}>Convite pendente</span>}
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", overflowWrap: "anywhere" }}>
            {director.email} · desde {new Date(director.since).toLocaleDateString("pt-PT")}
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {director.pending && (
            <form action={resendAction}>
              <input type="hidden" name="email" value={director.email} />
              <button type="submit" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }}>
                Reenviar convite
              </button>
            </form>
          )}
          <form
            action={removeAction}
            onSubmit={(e) => {
              if (!window.confirm(`Remover ${label} de diretor? A conta continua a existir.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="schoolId" value={schoolId} />
            <input type="hidden" name="userId" value={director.userId} />
            <button type="submit" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }}>
              Remover
            </button>
          </form>
        </div>
      </div>
      <Feedback state={resendState} />
      <Feedback state={removeState} />
    </div>
  );
}

export function DirectorsPanel({ schoolId, schoolName, directors }: { schoolId: string; schoolName: string; directors: DirectorRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card" style={{ padding: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>Diretores técnicos</h2>
        <button type="button" className="btn btn-primary" style={{ fontSize: "var(--text-sm)" }} onClick={() => setOpen(true)}>
          + Nomear diretor
        </button>
      </div>
      {directors.length === 0 && (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--warning)" }}>Esta escola ainda não tem diretor.</p>
      )}
      {directors.map((director) => (
        <DirectorItem key={director.userId} schoolId={schoolId} director={director} />
      ))}
      {open && <NominateModal schoolId={schoolId} schoolName={schoolName} onClose={() => setOpen(false)} />}
    </div>
  );
}
