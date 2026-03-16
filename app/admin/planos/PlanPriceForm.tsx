"use client";

import { useFormState } from "react-dom";
import { updatePlanPrice, type UpdatePlanPriceResult } from "./actions";

type PlanPriceRow = {
  id: string;
  intervalLabel: string;
  stripePriceId: string;
  amountCents: number;
};

type Props = {
  planPrices: PlanPriceRow[];
};

export function PlanPriceForm({ planPrices }: Props) {
  if (planPrices.length === 0) return null;

  return (
    <div
      className="card"
      style={{
        padding: "clamp(20px, 5vw, 24px)",
        marginTop: 24,
        borderLeft: "4px solid var(--primary)",
      }}
    >
      <h2 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
        Preços Stripe (subscrição)
      </h2>
      <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "var(--text-secondary)" }}>
        Se o pagamento falhar com &quot;No such price&quot;, os Price IDs na BD não correspondem ao modo Stripe (Teste vs Produção). Atualiza com os IDs do teu Stripe Dashboard.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {planPrices.map((pp) => (
          <PlanPriceRowForm key={pp.id} planPrice={pp} />
        ))}
      </div>
    </div>
  );
}

function PlanPriceRowForm({ planPrice }: { planPrice: PlanPriceRow }) {
  const [state, formAction] = useFormState(updatePlanPrice, null as UpdatePlanPriceResult | null);

  return (
    <form action={formAction} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
      <input type="hidden" name="planPriceId" value={planPrice.id} />
      <label style={{ flex: "1 1 200px", minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
          {planPrice.intervalLabel} · €{(planPrice.amountCents / 100).toFixed(0)}
        </span>
        <input
          type="text"
          name="stripePriceId"
          defaultValue={planPrice.stripePriceId}
          className="input"
          placeholder="price_xxx"
          style={{ width: "100%" }}
        />
      </label>
      <button type="submit" className="btn btn-secondary" style={{ padding: "8px 16px" }}>
        Atualizar
      </button>
      {state?.success && (
        <span style={{ fontSize: 13, color: "var(--success)" }}>Guardado.</span>
      )}
      {state?.error && (
        <span style={{ fontSize: 13, color: "var(--danger)" }}>{state.error}</span>
      )}
    </form>
  );
}
