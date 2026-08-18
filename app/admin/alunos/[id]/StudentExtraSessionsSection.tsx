"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { grantExtraSessions, type ExtraSessionsActionResult } from "../extra-sessions-actions";
import { FINANCE_PAYMENT_METHODS, FINANCE_PAYMENT_METHOD_LABELS_PT } from "@/lib/finance-payment-method";

type Props = {
  studentId: string;
  planName: string | null;
  maxCheckInsPerMonth: number | null;
  currentReferenceMonth: string;
  used: number;
  limit: number;
  remaining: number;
  extraGrants: Array<{ id: string; referenceMonth: string; quantity: number; note: string | null }>;
};

export function StudentExtraSessionsSection({
  studentId,
  planName,
  maxCheckInsPerMonth,
  currentReferenceMonth,
  used,
  limit,
  remaining,
  extraGrants,
}: Props) {
  const router = useRouter();
  const [state, formAction] = useFormState(grantExtraSessions, null as ExtraSessionsActionResult | null);

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state?.success, router]);

  if (maxCheckInsPerMonth === null) return null;

  return (
    <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", marginTop: 20 }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600 }}>Aulas extra ({planName ?? "plano com limite mensal"})</h2>

      <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)" }}>
        Este mês ({currentReferenceMonth}): <strong>{used}</strong> de <strong>{limit}</strong> aulas usadas ·{" "}
        <strong style={{ color: remaining > 0 ? "var(--success)" : "var(--danger)" }}>{remaining} restantes</strong>
        {limit > maxCheckInsPerMonth ? ` (inclui ${limit - maxCheckInsPerMonth} extra já concedidas)` : ""}
      </p>

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
          <input name="quantity" type="number" min="1" step="1" defaultValue="5" className="input" style={{ width: 90 }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Valor pago (€)</label>
          <input name="amount" type="number" min="0" step="0.01" className="input" style={{ width: 100 }} />
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
          <input name="note" type="text" className="input w-full" placeholder="Ex.: pacote extra pedido no WhatsApp" />
        </div>
        <button type="submit" className="btn btn-primary" style={{ fontSize: 14 }}>
          Registar pagamento e conceder
        </button>
      </form>
      {state?.error ? <p style={{ color: "var(--danger)", fontSize: 14, marginTop: 8 }}>{state.error}</p> : null}
      {state?.success ? <p style={{ color: "var(--success)", fontSize: 14, marginTop: 8 }}>Aulas extra concedidas.</p> : null}
    </section>
  );
}
