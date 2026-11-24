"use client";

import { useActionState, useState } from "react";
import { submitCoachAccessRequest, type CoachRequestFormState } from "./actions";

type SchoolOption = { id: string; name: string; modalities: { code: string; name: string }[] };

export function CoachRequestForm({ schools, defaultSchoolId }: { schools: SchoolOption[]; defaultSchoolId: string }) {
  const [state, formAction, pending] = useActionState<CoachRequestFormState | null, FormData>(submitCoachAccessRequest, null);
  const [schoolId, setSchoolId] = useState(defaultSchoolId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const school = schools.find((s) => s.id === schoolId) ?? schools[0];

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <form action={formAction} className="card" style={{ padding: "clamp(16px, 4vw, 20px)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Pedido de acesso como professor</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
          O Diretor Técnico da escola recebe o pedido e confirma.
        </p>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--text-secondary)" }}>
        Escola
        <select
          name="schoolId"
          className="input"
          value={school?.id ?? ""}
          onChange={(e) => {
            setSchoolId(e.target.value);
            setSelected(new Set());
          }}
          required
        >
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--text-secondary)" }}>
        Telemóvel (opcional)
        <input name="phone" type="tel" className="input" autoComplete="tel" placeholder="912 345 678" />
      </label>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>Modalidades que dás</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(school?.modalities ?? []).map((m) => {
            const on = selected.has(m.code);
            return (
              <label
                key={m.code}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontSize: 14,
                  border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`,
                  background: on ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "var(--bg-secondary)",
                  color: "var(--text-primary)",
                }}
              >
                <input
                  type="checkbox"
                  name="modalityCodes"
                  value={m.code}
                  checked={on}
                  onChange={() => toggle(m.code)}
                  style={{ margin: 0 }}
                />
                {m.name}
              </label>
            );
          })}
        </div>
      </fieldset>

      {state?.error && (
        <p role="alert" style={{ margin: 0, color: "var(--danger, #ef4444)", fontSize: 14 }}>
          {state.error}
        </p>
      )}

      <button type="submit" className="btn btn-primary" disabled={pending || selected.size === 0} style={{ alignSelf: "flex-start" }}>
        {pending ? "A enviar…" : "Enviar pedido"}
      </button>
    </form>
  );
}
