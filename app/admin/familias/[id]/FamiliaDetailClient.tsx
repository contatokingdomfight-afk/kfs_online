"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import {
  addFamilyMember,
  removeFamilyMember,
  deactivateFamilyGroup,
  updateFamilyGroupDiscount,
  updateMemberReferencePlan,
  searchStudentsForFamily,
  type FamilyActionResult,
} from "../actions";
import type { FamilyGroupDetail } from "@/lib/family-group";
import type { FamilyPricingBreakdown } from "@/lib/family-tuition";

type PlanOption = { id: string; name: string; priceMonthly: number };

type Props = {
  detail: FamilyGroupDetail;
  breakdown: FamilyPricingBreakdown | null;
  referencePlanOptions: PlanOption[];
};

function ReferencePlanSelect({
  groupId,
  studentId,
  currentPlanId,
  options,
}: {
  groupId: string;
  studentId: string;
  currentPlanId: string | null;
  options: PlanOption[];
}) {
  const [state, action] = useFormState(updateMemberReferencePlan, null as FamilyActionResult | null);
  return (
    <form action={action} style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="studentId" value={studentId} />
      <select
        name="referencePlanId"
        className="input"
        style={{ fontSize: 13, padding: "4px 6px" }}
        defaultValue={currentPlanId ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">— sem plano de referência —</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} — {p.priceMonthly.toFixed(0)} €
          </option>
        ))}
      </select>
      {state?.error && <span style={{ color: "var(--danger)", fontSize: 12 }}>{state.error}</span>}
    </form>
  );
}

export function FamiliaDetailClient({ detail, breakdown, referencePlanOptions }: Props) {
  const [addState, addAction] = useFormState(addFamilyMember, null as FamilyActionResult | null);
  const [removeState, removeAction] = useFormState(removeFamilyMember, null as FamilyActionResult | null);
  const [deactState, deactAction] = useFormState(deactivateFamilyGroup, null as FamilyActionResult | null);
  const [discountState, discountAction] = useFormState(updateFamilyGroupDiscount, null as FamilyActionResult | null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ studentId: string; name: string; email: string }>>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [newMemberReferencePlanId, setNewMemberReferencePlanId] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pendingSearch, startSearch] = useTransition();

  const { group, members } = detail;
  const canAdd = group.isActive;

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

  const errorMsg = addState?.error || removeState?.error || deactState?.error || discountState?.error;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {errorMsg && <p style={{ color: "var(--danger)", margin: 0 }}>{errorMsg}</p>}

      <div className="card" style={{ padding: 14 }}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
          {members.length} {members.length === 1 ? "membro" : "membros"} ·{" "}
          {group.isActive ? "Activo" : "Inactivo"}
        </p>
      </div>

      <section className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Mensalidade do titular</h2>
        {breakdown ? (
          <>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
              Base (soma dos planos de referência): {breakdown.baseTotal.toFixed(2)} €
            </p>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
              Desconto: {breakdown.discountPercent}% (−{breakdown.discountAmount.toFixed(2)} €)
            </p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Total mensal: {breakdown.finalMonthlyAmount.toFixed(2)} €
            </p>
            {breakdown.membersMissingReferencePlan.length > 0 && (
              <p style={{ margin: 0, fontSize: 13, color: "var(--warning, #b58900)" }}>
                {breakdown.membersMissingReferencePlan.length} membro(s) sem plano de referência definido — a usar
                valor de fallback até definires o plano real de cada um.
              </p>
            )}
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Não foi possível calcular a mensalidade.</p>
        )}
        <form action={discountAction} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <input type="hidden" name="groupId" value={group.id} />
          <label style={{ fontSize: 14 }}>
            Desconto % (default do grupo)
          </label>
          <input
            type="number"
            name="discountPercent"
            className="input"
            min={0}
            max={100}
            step="0.01"
            defaultValue={group.discountPercent}
            style={{ width: 90 }}
          />
          <button type="submit" className="btn btn-secondary" style={{ fontSize: 13 }}>
            Guardar
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 10px" }}>Membros</h2>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          O plano de referência de cada pessoa define a quota na mensalidade combinada e o acesso individual
          (modalidades, digital, check-in).
        </p>
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
                <div style={{ marginTop: 6 }}>
                  <ReferencePlanSelect
                    groupId={group.id}
                    studentId={m.studentId}
                    currentPlanId={m.referencePlanId}
                    options={referencePlanOptions}
                  />
                </div>
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
            <input type="hidden" name="referencePlanId" value={newMemberReferencePlanId} />
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 13 }}>Plano de referência do novo membro</span>
              <select
                className="input"
                value={newMemberReferencePlanId}
                onChange={(e) => setNewMemberReferencePlanId(e.target.value)}
              >
                <option value="">— sem plano de referência —</option>
                {referencePlanOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.priceMonthly.toFixed(0)} €
                  </option>
                ))}
              </select>
            </label>
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
