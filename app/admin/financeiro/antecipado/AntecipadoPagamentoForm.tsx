"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useFormState } from "react-dom";
import {
  createAdvanceTuitionPayments,
  searchStudentsForPayment,
  type AdvanceTuitionPaymentsResult,
  type StudentPaymentRow,
} from "../actions";
import { PaymentMethodSelect } from "@/components/admin/PaymentMethodSelect";

type Props = {
  defaultStartMonth: string;
};

export function AntecipadoPagamentoForm({ defaultStartMonth }: Props) {
  const [state, formAction] = useFormState(createAdvanceTuitionPayments, null as AdvanceTuitionPaymentsResult | null);
  const [startMonth, setStartMonth] = useState(defaultStartMonth);
  const [months, setMonths] = useState(3);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<StudentPaymentRow[]>([]);
  const [selected, setSelected] = useState<StudentPaymentRow | null>(null);

  const amountPerMonth =
    selected && selected.priceMonthly > 0 ? selected.priceMonthly : 0;
  const total = amountPerMonth * months;

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSearchError(null);
      setResults([]);
      setSearching(true);
      try {
        const res = await searchStudentsForPayment(query, startMonth);
        if ("error" in res) {
          setSearchError(res.error);
        } else {
          setResults(res.results);
          if (res.results.length === 0) {
            setSearchError("Nenhum aluno encontrado.");
          }
        }
      } finally {
        setSearching(false);
      }
    },
    [query, startMonth]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 560 }}>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
        Marca vários meses de mensalidade como <strong>Pago</strong> de uma vez. O cron não gerará atrasos nesses meses.
      </p>

      {!selected ? (
        <>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>Mês inicial</label>
            <input
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="input"
            />
          </div>
          <form onSubmit={handleSearch} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, email ou telefone"
              className="input"
              style={{ flex: "1 1 200px" }}
            />
            <button type="submit" className="btn btn-secondary" disabled={searching}>
              {searching ? "A pesquisar…" : "Pesquisar aluno"}
            </button>
          </form>
          {searchError ? <p style={{ color: "var(--danger)", fontSize: 14 }}>{searchError}</p> : null}
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {results.map((row) => (
              <li key={row.studentId}>
                <button
                  type="button"
                  className="card"
                  style={{ width: "100%", textAlign: "left", padding: 12, cursor: "pointer" }}
                  onClick={() => setSelected(row)}
                >
                  <strong>{row.name || row.email}</strong>
                  <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)" }}>
                    {row.planName} — {row.priceMonthly.toFixed(2)} €/mês
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input type="hidden" name="studentId" value={selected.studentId} />
          <input type="hidden" name="startMonth" value={startMonth} />
          <p style={{ margin: 0 }}>
            <strong>{selected.name || selected.email}</strong>
            <button
              type="button"
              onClick={() => setSelected(null)}
              style={{ marginLeft: 12, fontSize: 13, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}
            >
              Trocar aluno
            </button>
          </p>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>Mês inicial</label>
            <input
              type="month"
              name="startMonth"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>Número de meses</label>
            <input
              name="months"
              type="number"
              min={1}
              max={12}
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value, 10) || 1)}
              className="input"
              style={{ width: 100 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>Valor por mês (€)</label>
            <input
              name="amountPerMonth"
              type="number"
              step="0.01"
              min={0}
              defaultValue={amountPerMonth > 0 ? String(amountPerMonth) : ""}
              className="input"
              style={{ width: 140 }}
            />
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
            Total: <strong>{total.toFixed(2)} €</strong> ({months} mês{months > 1 ? "es" : ""})
          </p>
          <PaymentMethodSelect label="Forma de pagamento" />
          {state?.error ? <p style={{ color: "var(--danger)", fontSize: 14 }}>{state.error}</p> : null}
          {state?.success ? (
            <p style={{ color: "var(--success, #16a34a)", fontSize: 14 }}>
              {state.monthsPaid} mês(es) registado(s) como pago.
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary">
            Registar {months} mês{months > 1 ? "es" : ""} como pago
          </button>
        </form>
      )}

      <Link href="/admin/financeiro" className="btn btn-secondary" style={{ textDecoration: "none", alignSelf: "flex-start" }}>
        ← Voltar ao financeiro
      </Link>
    </div>
  );
}
