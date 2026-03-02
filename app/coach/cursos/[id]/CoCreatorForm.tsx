"use client";

import { useFormState } from "react-dom";
import { addCoCreator, removeCoCreator, type CoCreatorResult } from "../co-creator/actions";

type CoCreator = {
  id: string;
  student_id: string;
  revenue_pct: number;
  userName: string;
  userEmail: string;
};

type Props = {
  courseId: string;
  coCreators: CoCreator[];
  usedPct: number;
};

export function CoCreatorForm({ courseId, coCreators, usedPct }: Props) {
  const [state, formAction] = useFormState(addCoCreator, null as CoCreatorResult | null);

  const available = 65 - usedPct;

  return (
    <div>
      {coCreators.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {coCreators.map((cc) => (
            <li
              key={cc.id}
              style={{
                padding: "10px 14px",
                background: "var(--surface)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div>
                <span style={{ fontWeight: 500, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
                  {cc.userName || cc.userEmail}
                </span>
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 13,
                    padding: "2px 8px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--primary)",
                    color: "#fff",
                  }}
                >
                  {cc.revenue_pct}%
                </span>
                {cc.userEmail && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                    {cc.userEmail}
                  </span>
                )}
              </div>
              <RemoveButton courseId={courseId} coCreatorId={cc.id} />
            </li>
          ))}
        </ul>
      )}

      {available > 0 && (
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="hidden" name="courseId" value={courseId} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="email"
              name="coachEmail"
              className="input"
              placeholder="Email do coach co-criador"
              style={{ flex: "1 1 180px" }}
              required
            />
            <input
              type="number"
              name="revenue_pct"
              className="input"
              placeholder={`% (máx. ${available})`}
              min={1}
              max={available}
              style={{ width: 100 }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
              Adicionar
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
            Disponível para distribuir: <strong style={{ color: "var(--primary)" }}>{available}%</strong> dos 65% do coach
          </p>
          {state?.error && (
            <p style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>{state.error}</p>
          )}
          {state && !state.error && (
            <p style={{ margin: 0, fontSize: 14, color: "var(--success)" }}>Co-criador adicionado!</p>
          )}
        </form>
      )}

      {available <= 0 && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
          100% dos 65% do coach já foi distribuído. Remove um co-criador para adicionar outro.
        </p>
      )}
    </div>
  );
}

function RemoveButton({ courseId, coCreatorId }: { courseId: string; coCreatorId: string }) {
  const [state, formAction] = useFormState(removeCoCreator, null as CoCreatorResult | null);

  return (
    <form action={formAction}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="coCreatorId" value={coCreatorId} />
      <button
        type="submit"
        style={{
          background: "none",
          border: "1px solid var(--danger)",
          color: "var(--danger)",
          borderRadius: "var(--radius-md)",
          padding: "4px 12px",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Remover
      </button>
      {state?.error && (
        <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--danger)" }}>{state.error}</p>
      )}
    </form>
  );
}
