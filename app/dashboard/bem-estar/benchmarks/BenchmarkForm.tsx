"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitBenchmarkAction, type SimpleFormState } from "../actions";
import { BENCHMARK_PRESETS } from "@/lib/benchmark-presets";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "…" : label}
    </button>
  );
}

type Props = { locale: "pt" | "en" };

export function BenchmarkForm({ locale }: Props) {
  const [state, action] = useFormState(submitBenchmarkAction, null as SimpleFormState);

  return (
    <form
      action={action}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 16,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-elevated)",
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{locale === "pt" ? "Teste" : "Test"}</span>
        <select
          name="benchmarkKey"
          required
          style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
        >
          <option value="">{locale === "pt" ? "Escolher…" : "Choose…"}</option>
          {BENCHMARK_PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {locale === "pt" ? p.labelPt : p.labelEn} ({p.unit})
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{locale === "pt" ? "Valor" : "Value"}</span>
        <input
          name="value"
          type="number"
          step="any"
          min={0}
          required
          placeholder={locale === "pt" ? "ex.: 42" : "e.g. 42"}
          style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{locale === "pt" ? "Notas (opcional)" : "Notes (optional)"}</span>
        <input
          name="notes"
          type="text"
          maxLength={300}
          style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
        />
      </label>
      {state?.error && <p style={{ color: "var(--danger)", margin: 0 }}>{state.error}</p>}
      <Submit label={locale === "pt" ? "Guardar teste" : "Save test"} />
    </form>
  );
}
