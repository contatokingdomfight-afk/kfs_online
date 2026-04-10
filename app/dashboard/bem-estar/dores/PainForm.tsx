"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitPainAction, type SimpleFormState } from "../actions";
import { PAIN_REGIONS } from "@/lib/pain-regions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "…" : label}
    </button>
  );
}

type Props = { locale: "pt" | "en" };

export function PainForm({ locale }: Props) {
  const [state, action] = useFormState(submitPainAction, null as SimpleFormState);

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
        <span style={{ fontWeight: 600 }}>{locale === "pt" ? "Zona" : "Area"}</span>
        <select
          name="bodyRegion"
          required
          style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
        >
          <option value="">{locale === "pt" ? "Escolher…" : "Choose…"}</option>
          {PAIN_REGIONS.map((r) => (
            <option key={r.key} value={r.key}>
              {locale === "pt" ? r.labelPt : r.labelEn}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{locale === "pt" ? "Intensidade (1–10)" : "Intensity (1–10)"}</span>
        <input
          name="intensity"
          type="number"
          min={1}
          max={10}
          defaultValue={3}
          required
          style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{locale === "pt" ? "Notas (opcional)" : "Notes (optional)"}</span>
        <textarea
          name="notes"
          rows={2}
          maxLength={500}
          style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
        />
      </label>
      {state?.error && <p style={{ color: "var(--danger)", margin: 0 }}>{state.error}</p>}
      <Submit label={locale === "pt" ? "Registar" : "Save"} />
    </form>
  );
}
