"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { XP_SOURCE_META, XP_SOURCES, type XpSource } from "@/lib/xp-rules";
import { saveXpRules } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "A guardar…" : "Guardar regras"}
    </button>
  );
}

export function XpRulesForm({ rules }: { rules: Record<XpSource, number> }) {
  const [state, action] = useActionState(saveXpRules, null);
  const [values, setValues] = useState<Record<XpSource, string>>(
    () => Object.fromEntries(XP_SOURCES.map((s) => [s, String(rules[s])])) as Record<XpSource, string>
  );

  return (
    <form action={action} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {XP_SOURCES.map((s) => {
        const n = Number(values[s]);
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <label htmlFor={`xp-${s}`} style={{ flex: "1 1 220px", minWidth: 0 }}>
              <span style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600 }}>
                <span aria-hidden>{XP_SOURCE_META[s].emoji}</span> {XP_SOURCE_META[s].label}
              </span>
              <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                {Number.isFinite(n) ? XP_SOURCE_META[s].rule(n) : "—"}
              </span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                id={`xp-${s}`}
                name={s}
                type="number"
                inputMode="numeric"
                min={0}
                max={10000}
                step={1}
                required
                className="input"
                value={values[s]}
                onChange={(e) => setValues((v) => ({ ...v, [s]: e.target.value }))}
                style={{ width: 100 }}
              />
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>XP</span>
            </div>
          </div>
        );
      })}
      {state?.error && (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--success)" }}>
          Regras guardadas. O ranking já usa os novos valores.
        </p>
      )}
      <div>
        <Submit />
      </div>
    </form>
  );
}
