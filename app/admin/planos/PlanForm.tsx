"use client";

import { useFormState } from "react-dom";
import { createPlan, updatePlan, type PlanFormResult } from "./actions";

const MODALITY_SCOPES = [
  { value: "NONE", label: "Só digital (sem presencial)" },
  { value: "SINGLE", label: "Uma modalidade presencial" },
  { value: "ALL", label: "Todas as modalidades" },
] as const;

type Props = {
  planId?: string;
  initialName?: string;
  initialDescription?: string;
  initialPriceMonthly?: number | string;
  initialIncludesDigital?: boolean;
  initialModalityScope?: string;
  initialIsActive?: boolean;
  initialStripePriceId?: string;
};

export function PlanForm({
  planId,
  initialName = "",
  initialDescription = "",
  initialPriceMonthly = "",
  initialIncludesDigital = false,
  initialModalityScope = "SINGLE",
  initialIsActive = true,
  initialStripePriceId = "",
}: Props) {
  const action = planId ? updatePlan : createPlan;
  const [state, formAction] = useFormState(action, null as PlanFormResult | null);

  return (
    <form
      action={formAction}
      className="card"
      style={{
        padding: "clamp(20px, 5vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(16px, 4vw, 20px)",
      }}
    >
      {planId && <input type="hidden" name="planId" value={planId} />}
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Nome
        </span>
        <input
          type="text"
          name="name"
          defaultValue={initialName}
          className="input"
          placeholder="Ex.: Kingdom FULL"
          required
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Descrição
        </span>
        <textarea
          name="description"
          defaultValue={initialDescription}
          className="input"
          placeholder="O que inclui o plano?"
          rows={3}
          style={{ resize: "vertical" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Preço mensal (€)
        </span>
        <input
          type="number"
          name="price_monthly"
          defaultValue={initialPriceMonthly}
          className="input"
          placeholder="0"
          min={0}
          step={0.01}
          required
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Stripe Price ID (assinatura mensal)
        </span>
        <input
          type="text"
          name="stripePriceId"
          defaultValue={initialStripePriceId}
          className="input"
          placeholder="price_xxx (criar no Stripe Dashboard)"
        />
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
          Cria um Product e Price recorrente mensal no Stripe; cola aqui o Price ID para permitir pagamento por cartão.
        </span>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Âmbito de modalidade
        </span>
        <select name="modality_scope" className="input" defaultValue={initialModalityScope}>
          {MODALITY_SCOPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="checkbox"
          name="includes_digital_access"
          defaultChecked={initialIncludesDigital}
          value="on"
        />
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
          Inclui acesso à plataforma digital
        </span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="checkbox" name="is_active" defaultChecked={initialIsActive} value="on" />
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
          Plano ativo (visível para atribuição)
        </span>
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary">
        {planId ? "Guardar" : "Criar plano"}
      </button>
    </form>
  );
}
