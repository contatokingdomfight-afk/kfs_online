"use client";

import { useActionState, useState } from "react";
import { setCoachSchoolModalities, type CoachRequestDecisionResult } from "../actions";

export type CoachSchoolModalities = {
  schoolId: string;
  schoolName: string;
  offered: { code: string; name: string }[];
  selected: string[];
};

function SchoolForm({ coachId, school }: { coachId: string; school: CoachSchoolModalities }) {
  const [selected, setSelected] = useState(new Set(school.selected));
  const [state, action, pending] = useActionState<CoachRequestDecisionResult | null, FormData>(setCoachSchoolModalities, null);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
      <input type="hidden" name="coachId" value={coachId} />
      <input type="hidden" name="schoolId" value={school.schoolId} />
      <strong style={{ fontSize: 14, fontWeight: 600 }}>{school.schoolName}</strong>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {school.offered.map((m) => {
          const on = selected.has(m.code);
          return (
            <label
              key={m.code}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 999,
                cursor: "pointer",
                fontSize: 13,
                border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`,
                background: on ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "var(--bg-secondary)",
              }}
            >
              <input
                type="checkbox"
                name="modalityCodes"
                value={m.code}
                checked={on}
                onChange={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(m.code)) next.delete(m.code);
                    else next.add(m.code);
                    return next;
                  })
                }
                style={{ margin: 0 }}
              />
              {m.name}
            </label>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="submit" className="btn btn-secondary" disabled={pending} style={{ fontSize: 13 }}>
          {pending ? "A guardar…" : "Guardar modalidades"}
        </button>
        {state?.ok && <span style={{ fontSize: 13, color: "var(--success, #34d399)" }}>Guardado.</span>}
        {state?.error && <span style={{ fontSize: 13, color: "var(--danger)" }}>{state.error}</span>}
      </div>
    </form>
  );
}

export function CoachModalitiesEditor({ coachId, schools }: { coachId: string; schools: CoachSchoolModalities[] }) {
  if (schools.length === 0) return null;
  return (
    <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)", marginTop: "clamp(20px, 5vw, 24px)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600 }}>Modalidades que dá (remuneração)</span>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
          Decidem que mensalidades contam para este professor. Se uma modalidade tiver vários professores, divide-se em partes iguais.
        </p>
      </div>
      {schools.map((s) => (
        <SchoolForm key={s.schoolId} coachId={coachId} school={s} />
      ))}
    </div>
  );
}
