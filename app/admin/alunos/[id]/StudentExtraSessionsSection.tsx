"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { grantExtraSessions, type ExtraSessionsActionResult } from "../extra-sessions-actions";
import { FINANCE_PAYMENT_METHODS, FINANCE_PAYMENT_METHOD_LABELS_PT } from "@/lib/finance-payment-method";
import {
  calculateDropInPrice,
  formatDropInPriceEur,
  KINGDOM_WEEK_EXHAUSTED_BUNDLE_QUANTITY,
  type DropInPricingContext,
} from "@/lib/drop-in-sessions-pricing";

type Props = {
  studentId: string;
  /** Plano com limite mensal (ex. Kingdom Week) ou só avulso sem plano. */
  mode: "plan_cap" | "drop_in_only";
  planName: string | null;
  maxCheckInsPerMonth: number | null;
  currentReferenceMonth: string;
  used: number;
  limit: number;
  remaining: number;
  extraGrants: Array<{ id: string; referenceMonth: string; quantity: number; note: string | null }>;
  pricingContext: DropInPricingContext;
  revalidateCoachPath?: string;
};

export function StudentExtraSessionsSection({
  studentId,
  mode,
  planName,
  maxCheckInsPerMonth,
  currentReferenceMonth,
  used,
  limit,
  remaining,
  extraGrants,
  pricingContext,
  revalidateCoachPath,
}: Props) {
  const router = useRouter();
  const [state, formAction] = useFormState(grantExtraSessions, null as ExtraSessionsActionResult | null);
  const [quantity, setQuantity] = useState(mode === "plan_cap" ? KINGDOM_WEEK_EXHAUSTED_BUNDLE_QUANTITY : 1);

  const quote = useMemo(() => calculateDropInPrice(quantity, pricingContext), [quantity, pricingContext]);

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state?.success, router]);

  const title =
    mode === "drop_in_only"
      ? "Aulas avulsas"
      : `Aulas extra / avulsas (${planName ?? "plano com limite mensal"})`;

  return (
    <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", marginTop: 20 }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600 }}>{title}</h2>

      {mode === "plan_cap" && maxCheckInsPerMonth !== null ? (
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)" }}>
          Este mês ({currentReferenceMonth}): <strong>{used}</strong> de <strong>{limit}</strong> aulas usadas ·{" "}
          <strong style={{ color: remaining > 0 ? "var(--success)" : "var(--danger)" }}>{remaining} restantes</strong>
          {limit > maxCheckInsPerMonth ? ` (inclui ${limit - maxCheckInsPerMonth} extra já concedidas)` : ""}
        </p>
      ) : (
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)" }}>
          Aluno sem plano mensal. Este mês ({currentReferenceMonth}): <strong>{used}</strong> de{" "}
          <strong>{limit}</strong> aulas avulsas usadas ·{" "}
          <strong style={{ color: remaining > 0 ? "var(--success)" : "var(--danger)" }}>{remaining} restantes</strong>
        </p>
      )}

      {pricingContext.isKingdomWeekPlan && pricingContext.weekCapExhausted && (
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-secondary)" }}>
          Plano Week esgotado este mês — pacote de {KINGDOM_WEEK_EXHAUSTED_BUNDLE_QUANTITY} aulas a €25 (−40% vs avulso).
        </p>
      )}

      {extraGrants.length > 0 && (
        <ul style={{ margin: "0 0 16px", padding: 0, listStyle: "none", fontSize: 13, color: "var(--text-secondary)" }}>
          {extraGrants.map((g) => (
            <li key={g.id} style={{ padding: "4px 0" }}>
              {g.referenceMonth}: +{g.quantity} aula{g.quantity > 1 ? "s" : ""}
              {g.note ? ` — ${g.note}` : ""}
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <input type="hidden" name="studentId" value={studentId} />
        {revalidateCoachPath ? <input type="hidden" name="revalidateCoachPath" value={revalidateCoachPath} /> : null}
        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Mês</label>
          <input
            name="referenceMonth"
            type="month"
            defaultValue={currentReferenceMonth}
            className="input"
            style={{ width: 140 }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Quantidade de aulas</label>
          <input
            name="quantity"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="input"
            style={{ width: 90 }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Valor (€)</label>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            readOnly
            value={formatDropInPriceEur(quote.amountEur)}
            className="input"
            style={{ width: 100, background: "var(--surface-secondary, #f5f5f5)" }}
          />
        </div>
        <div style={{ flex: "1 1 180px", fontSize: 13, color: "var(--text-secondary)", paddingBottom: 8 }}>
          {quote.discountPercent > 0 ? (
            <>
              <span style={{ textDecoration: "line-through", marginRight: 8 }}>€{formatDropInPriceEur(quote.listPriceEur)}</span>
              <strong style={{ color: "var(--success)" }}>−{quote.discountPercent}%</strong>
              <span style={{ display: "block", marginTop: 4 }}>{quote.summaryLabel}</span>
            </>
          ) : (
            <span>{quote.summaryLabel} · €{formatDropInPriceEur(quote.amountEur)}</span>
          )}
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Forma de pagamento</label>
          <select name="paymentMethod" className="input" style={{ width: 160 }}>
            {FINANCE_PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {FINANCE_PAYMENT_METHOD_LABELS_PT[m]}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Nota (opcional)</label>
          <input name="note" type="text" className="input w-full" placeholder="Ex.: pagamento na receção" />
        </div>
        <button type="submit" className="btn btn-primary" style={{ fontSize: 14 }}>
          Registar pagamento e conceder
        </button>
      </form>
      {state?.error ? <p style={{ color: "var(--danger)", fontSize: 14, marginTop: 8 }}>{state.error}</p> : null}
      {state?.success ? <p style={{ color: "var(--success)", fontSize: 14, marginTop: 8 }}>Aulas concedidas.</p> : null}
    </section>
  );
}
