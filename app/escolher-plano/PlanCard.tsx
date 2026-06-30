"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { selectPlanPayAtSchool, type SelectPlanPayAtSchoolResult } from "./actions";

type ModalityOption = { code: string; name: string };

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  includes_digital_access: boolean;
  includes_performance_tracking: boolean;
  includes_check_in: boolean;
  modality_scope: string | null;
  includes_exclusive_benefits: boolean;
};

type Props = {
  plan: Plan;
  studentId: string | null;
  locale: "pt" | "en";
  perMonth: string;
  choosePlanSelect: string;
  choosePlanPayAtSchoolHint: string;
  choosePlanModalityLabel: string;
  modalityOptions: ModalityOption[];
};

function SubmitButton({ label, locale }: { label: string; locale: "pt" | "en" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" style={{ marginTop: "auto" }} disabled={pending}>
      {pending ? (locale === "pt" ? "A registar…" : "Saving…") : label}
    </button>
  );
}

export function PlanCard({
  plan,
  studentId,
  locale,
  perMonth,
  choosePlanSelect,
  choosePlanPayAtSchoolHint,
  choosePlanModalityLabel,
  modalityOptions,
}: Props) {
  const [state, formAction] = useFormState(selectPlanPayAtSchool, null as SelectPlanPayAtSchoolResult | null);
  const [primaryModality, setPrimaryModality] = useState(modalityOptions[0]?.code ?? "");
  const isEn = locale === "en";
  const needsModality = plan.modality_scope === "SINGLE";

  const benefits: string[] = [];
  if (plan.includes_check_in) benefits.push(isEn ? "Class check-in" : "Check-in nas aulas");
  if (plan.includes_digital_access) benefits.push(isEn ? "Digital library access" : "Acesso à biblioteca digital");
  if (plan.includes_performance_tracking) benefits.push(isEn ? "Performance tracking" : "Acompanhamento de performance");
  if (plan.modality_scope === "ALL") benefits.push(isEn ? "All modalities" : "Todas as modalidades");
  else if (plan.modality_scope === "SINGLE") benefits.push(isEn ? "One modality" : "Uma modalidade");
  if (plan.includes_exclusive_benefits) benefits.push(isEn ? "Exclusive benefits" : "Benefícios exclusivos");

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "clamp(20px, 5vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        backgroundColor: "var(--bg-secondary, var(--bg))",
      }}
    >
      <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{plan.name}</h3>
      {plan.description && (
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>{plan.description}</p>
      )}
      <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
        €{plan.price_monthly.toFixed(0)}
        <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-secondary)" }}>{perMonth}</span>
      </p>
      <ul style={{ paddingLeft: 20, margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
        {benefits.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>

      {studentId ? (
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: "auto" }}>
          <input type="hidden" name="planId" value={plan.id} />
          {needsModality && modalityOptions.length > 0 && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
              <span style={{ fontWeight: 500 }}>{choosePlanModalityLabel}</span>
              <select
                name="primaryModality"
                value={primaryModality}
                onChange={(e) => setPrimaryModality(e.target.value)}
                className="input"
                required
              >
                {modalityOptions.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{choosePlanPayAtSchoolHint}</p>
          {state?.error && (
            <p style={{ fontSize: 13, color: "var(--danger, #dc2626)", margin: 0 }} role="alert">
              {state.error}
            </p>
          )}
          <SubmitButton label={choosePlanSelect} locale={locale} />
        </form>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
          {isEn ? "Sign in to choose a plan." : "Inicia sessão para escolher um plano."}
        </p>
      )}
    </div>
  );
}
