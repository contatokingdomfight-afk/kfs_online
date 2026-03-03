"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import {
  generateMonthlyPaymentsFormAction,
  type GenerateMonthlyPaymentsResult,
} from "./actions";
import type { RenewalPending } from "@/lib/renewals";

type Props = {
  referenceMonth: string;
  pending: RenewalPending[];
};

export function RenewalsSection({ referenceMonth, pending }: Props) {
  const [state, formAction] = useFormState(
    generateMonthlyPaymentsFormAction,
    null as GenerateMonthlyPaymentsResult | null
  );

  const monthLabel = `${referenceMonth.slice(5)}/${referenceMonth.slice(0, 4)}`;

  return (
    <section
      className="card"
      style={{
        padding: "clamp(16px, 4vw, 20px)",
        marginBottom: "clamp(20px, 5vw, 24px)",
      }}
    >
      <h2
        style={{
          margin: "0 0 clamp(12px, 3vw, 16px) 0",
          fontSize: "clamp(17px, 4.2vw, 19px)",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        Renovações do mês ({monthLabel})
      </h2>
      <p
        style={{
          margin: "0 0 clamp(12px, 3vw, 16px) 0",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          color: "var(--text-secondary)",
        }}
      >
        Alunos com plano que ainda não têm pagamento registado neste mês. Podes registar manualmente
        ou gerar todas as mensalidades de uma vez (ficam como &quot;Em atraso&quot; até marcar como
        pago).
      </p>

      {state != null && !state.error && (state.created > 0 || state.skipped > 0) && (
        <p
          style={{
            margin: "0 0 12px 0",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--success)",
          }}
          role="status"
        >
          Mensalidades geradas: {state.created}. Já existiam: {state.skipped}.
        </p>
      )}
      {state?.error && (
        <p
          style={{
            margin: "0 0 12px 0",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--danger)",
          }}
          role="alert"
        >
          {state.error}
        </p>
      )}

      {pending.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-secondary)",
          }}
        >
          Nenhuma renovação pendente para este mês (todos os alunos com plano já têm pagamento
          registado).
        </p>
      ) : (
        <>
          <form action={formAction} style={{ marginBottom: "clamp(12px, 3vw, 16px)" }}>
            <input type="hidden" name="referenceMonth" value={referenceMonth} />
            <button type="submit" className="btn btn-primary">
              Gerar mensalidades do mês ({pending.length} alunos)
            </button>
          </form>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "clamp(8px, 2vw, 10px)",
            }}
          >
            {pending.map((r) => (
              <li
                key={r.studentId}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "clamp(10px, 2.5vw, 12px)",
                  backgroundColor: "var(--bg)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {r.studentName}
                  </span>
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: "clamp(13px, 3.2vw, 15px)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {r.planName} · {r.priceMonthly.toFixed(0)} €
                  </span>
                </div>
                <Link
                  href={`/admin/financeiro/novo?studentId=${encodeURIComponent(r.studentId)}&referenceMonth=${encodeURIComponent(referenceMonth)}&amount=${r.priceMonthly}`}
                  className="btn"
                  style={{
                    fontSize: "clamp(13px, 3.2vw, 15px)",
                    textDecoration: "none",
                    padding: "6px 12px",
                  }}
                >
                  Registar pagamento
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
