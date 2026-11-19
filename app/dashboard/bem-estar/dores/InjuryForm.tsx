"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitInjuryAction, type SimpleFormState } from "../actions";
import { PAIN_REGIONS } from "@/lib/pain-regions";
import { BODY_SIDES, INJURY_TYPES } from "@/lib/body-map/marks";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "…" : label}
    </button>
  );
}

type Props = { locale: "pt" | "en" };

/** O aluno declara lesões anteriores (fratura, distensão, entorse…); aparecem no mapa corporal. */
export function InjuryForm({ locale }: Props) {
  const pt = locale === "pt";
  const [state, action] = useActionState(submitInjuryAction, null as SimpleFormState);

  return (
    <form
      action={action}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 16,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-elevated)",
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{pt ? "Tipo de lesão" : "Type of injury"}</span>
        <select name="injuryType" required className="input" defaultValue="">
          <option value="">{pt ? "Escolher…" : "Choose…"}</option>
          {INJURY_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {pt ? t.pt : t.en}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{pt ? "Zona" : "Area"}</span>
        <select name="bodyRegion" required className="input" defaultValue="">
          <option value="">{pt ? "Escolher…" : "Choose…"}</option>
          {PAIN_REGIONS.filter((r) => r.key !== "OTHER").map((r) => (
            <option key={r.key} value={r.key}>
              {pt ? r.labelPt : r.labelEn}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{pt ? "Lado (opcional)" : "Side (optional)"}</span>
        <select name="side" className="input" defaultValue="">
          <option value="">{pt ? "Não sei / não se aplica" : "Not sure / not applicable"}</option>
          {BODY_SIDES.map((s) => (
            <option key={s.key} value={s.key}>
              {pt ? s.pt : s.en}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{pt ? "Ano (opcional)" : "Year (optional)"}</span>
        <input name="occurredYear" type="number" inputMode="numeric" min={1950} max={new Date().getFullYear()} className="input" />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" name="recovered" value="true" />
        <span>{pt ? "Já recuperei totalmente" : "Fully recovered"}</span>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{pt ? "Notas (opcional)" : "Notes (optional)"}</span>
        <textarea name="notes" rows={2} maxLength={300} className="input" />
      </label>
      {state?.error && <p style={{ color: "var(--danger)", margin: 0 }}>{state.error}</p>}
      <Submit label={pt ? "Registar lesão" : "Save injury"} />
    </form>
  );
}
