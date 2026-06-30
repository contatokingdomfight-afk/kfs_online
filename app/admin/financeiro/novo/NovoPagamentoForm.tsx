"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useFormState } from "react-dom";
import {
  createPayment,
  searchStudentsForPayment,
  type CreatePaymentResult,
  type StudentPaymentRow,
} from "../actions";

type Props = {
  defaultReferenceMonth: string;
  /** Quando aberto com ?studentId=… (ex. renovações). */
  initialRow?: StudentPaymentRow | null;
  /** Valor inicial da URL (?amount=). */
  urlAmount?: string;
};

function statusLabelPt(status: string) {
  if (status === "PAID") return "Pago";
  if (status === "LATE") return "Em atraso";
  return status;
}

export function NovoPagamentoForm({ defaultReferenceMonth, initialRow, urlAmount = "" }: Props) {
  const [state, formAction] = useFormState(createPayment, null as CreatePaymentResult | null);

  const [referenceMonth, setReferenceMonth] = useState(defaultReferenceMonth);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<StudentPaymentRow[]>([]);
  const [selected, setSelected] = useState<StudentPaymentRow | null>(initialRow ?? null);

  const openForm = useCallback((row: StudentPaymentRow) => {
    setSelected(row);
    setSearchError(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(null);
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    setResults([]);
    setSearching(true);
    try {
      const res = await searchStudentsForPayment(query, referenceMonth);
      if ("error" in res) {
        setSearchError(res.error);
        setResults([]);
      } else {
        setResults(res.results);
        if (res.results.length === 0) {
          setSearchError("Nenhum aluno encontrado. Tenta outro nome, email ou telefone.");
        } else {
          setSearchError(null);
        }
      }
    } finally {
      setSearching(false);
    }
  }

  const defaultAmountStr =
    urlAmount.trim() !== ""
      ? urlAmount.trim()
      : selected && selected.priceMonthly > 0
        ? String(selected.priceMonthly)
        : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      {!selected && (
        <>
          <div
            className="card"
            style={{
              padding: "clamp(20px, 5vw, 24px)",
              display: "flex",
              flexDirection: "column",
              gap: "clamp(14px, 3.5vw, 18px)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(16px, 4vw, 18px)",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              1. Mês de referência
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
              O mês serve para mostrar se já existe pagamento registado e para o novo registo.
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Mês (AAAA-MM) *</span>
              <input
                type="month"
                value={referenceMonth}
                onChange={(e) => setReferenceMonth(e.target.value)}
                className="input"
                required
              />
            </label>
          </div>

          <div
            className="card"
            style={{
              padding: "clamp(20px, 5vw, 24px)",
              display: "flex",
              flexDirection: "column",
              gap: "clamp(14px, 3.5vw, 18px)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(16px, 4vw, 18px)",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              2. Pesquisar aluno
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
              Nome, email ou telefone (mínimo 2 caracteres).
            </p>
            <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input"
                placeholder="Ex.: Maria, maria@… ou 912…"
                autoComplete="off"
              />
              <button type="submit" className="btn btn-primary" disabled={searching || query.trim().length < 2}>
                {searching ? "A pesquisar…" : "Pesquisar"}
              </button>
            </form>
            {searchError && (
              <p style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>{searchError}</p>
            )}
            {results.length > 0 && (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {results.map((r) => (
                  <li
                    key={r.studentId}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: "12px 14px",
                      background: "var(--surface)",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>
                      {r.name || "—"} <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>{r.email}</span>
                    </div>
                    {r.phone && (
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>Tel. {r.phone}</div>
                    )}
                    <div style={{ fontSize: 13, marginTop: 8, color: "var(--text-secondary)" }}>
                      Plano: <strong style={{ color: "var(--text-primary)" }}>{r.planName ?? "—"}</strong>
                      {r.priceMonthly > 0 && (
                        <>
                          {" "}
                          · Mensalidade sugerida: <strong style={{ color: "var(--text-primary)" }}>{r.priceMonthly.toFixed(2)} €</strong>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4, color: "var(--text-secondary)" }}>
                      Mês {r.referenceMonth}:{" "}
                      {r.existingPayment ? (
                        <>
                          já existe registo — <strong style={{ color: "var(--text-primary)" }}>{statusLabelPt(r.existingPayment.status)}</strong> (
                          {Number(r.existingPayment.amount).toFixed(2)} €)
                        </>
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>sem pagamento registado neste mês</span>
                      )}
                    </div>
                    <button type="button" className="btn btn-primary" style={{ marginTop: 10, fontSize: 14 }} onClick={() => openForm(r)}>
                      Selecionar este aluno
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {selected && (
        <div
          className="card"
          style={{
            padding: "clamp(20px, 5vw, 24px)",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(16px, 4vw, 20px)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
              Registar pagamento
            </h2>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 14 }} onClick={clearSelection}>
              ← Escolher outro aluno
            </button>
          </div>
          <div
            style={{
              fontSize: 13,
              padding: "10px 12px",
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
              borderLeft: "3px solid var(--primary)",
            }}
          >
            <div>
              <strong>{selected.name || "—"}</strong> {selected.email && <span style={{ color: "var(--text-secondary)" }}>{selected.email}</span>}
            </div>
            {selected.phone && <div style={{ color: "var(--text-secondary)", marginTop: 4 }}>Tel. {selected.phone}</div>}
            <div style={{ marginTop: 6 }}>
              Plano: {selected.planName ?? "—"}
              {selected.priceMonthly > 0 && <> · Sugestão: {selected.priceMonthly.toFixed(2)} €/mês</>}
            </div>
            <div style={{ marginTop: 4, color: "var(--text-secondary)" }}>
              Mês {referenceMonth}:{" "}
              {selected.existingPayment ? (
                <>
                  já existe <strong>{statusLabelPt(selected.existingPayment.status)}</strong> (
                  {Number(selected.existingPayment.amount).toFixed(2)} €) — podes registar outro movimento se for correção.
                </>
              ) : (
                "sem registo neste mês."
              )}
            </div>
            {selected.isPaymentSuspended && (
              <p style={{ margin: "10px 0 0 0", fontSize: 13, color: "var(--danger)", fontWeight: 500 }}>
                Acesso suspenso por falta de pagamento. Marca este mês como «Pago» para repor o plano do aluno.
              </p>
            )}
            {selected.isFamilyNonTitular && (
              <p style={{ margin: "10px 0 0 0", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                Mensalidade coberta pelo titular do grupo familiar — regista pagamentos de matrícula/seguro em «Primeiro pagamento» se necessário.
              </p>
            )}
            {selected.familyMemberCount != null && selected.familyMemberCount > 0 && (
              <p style={{ margin: "10px 0 0 0", fontSize: 13, color: "var(--primary)" }}>
                Titular do plano família ({selected.familyMemberCount} membros) — valor sugerido é o pacote familiar.
              </p>
            )}
          </div>

            {(selected.isFirstPaymentEligible || selected.hasPendingOnboarding) && (
              <div
                style={{
                  padding: "12px 14px",
                  background: "rgba(var(--primary-rgb, 59, 130, 246), 0.08)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  fontSize: 13,
                }}
              >
                {selected.hasPendingOnboarding ? (
                  <>
                    <strong>Pagamentos de inscrição pendentes</strong> — matrícula, seguro e/ou mensalidade já
                    gerados.{" "}
                    <Link
                      href="/admin/financeiro/primeiro-pagamento"
                      style={{ color: "var(--primary)", fontWeight: 600 }}
                    >
                      Confirmar em «Primeiro pagamento»
                    </Link>
                  </>
                ) : (
                  <>
                    <strong>Primeiro pagamento</strong> — este aluno ainda não tem pagamentos registados.{" "}
                    <Link
                      href="/admin/financeiro/primeiro-pagamento"
                      style={{ color: "var(--primary)", fontWeight: 600 }}
                    >
                      Usar fluxo de inscrição (matrícula + seguro)
                    </Link>
                  </>
                )}
              </div>
            )}

          <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
            <input type="hidden" name="studentId" value={selected.studentId} />
            {selected.isFamilyNonTitular ? (
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                Seleciona o titular do grupo para registar a mensalidade familiar.
              </p>
            ) : (
              <>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
                Mês de referência (AAAA-MM) *
              </span>
              <input type="month" name="referenceMonth" required className="input" defaultValue={referenceMonth} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
                Mensalidade (€) *
              </span>
              <input
                type="number"
                name="amount"
                required
                min="0"
                step="0.01"
                className="input"
                placeholder="0.00"
                key={`amt-${selected.studentId}-${defaultAmountStr}`}
                defaultValue={defaultAmountStr}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
                Meses de mensalidade
              </span>
              <input
                type="number"
                name="tuitionMonths"
                min={1}
                max={12}
                defaultValue={1}
                className="input"
                style={{ maxWidth: 120 }}
              />
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Padrão: 1 (mês de referência). Com status «Pago», regista meses consecutivos.
              </span>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
                Status *
              </span>
              <select name="status" required className="input" defaultValue="PAID">
                <option value="PAID">Pago</option>
                <option value="LATE">Em atraso</option>
              </select>
            </label>
            {state?.error && (
              <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>{state.error}</p>
            )}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
              <Link href="/admin/financeiro" className="btn btn-secondary" style={{ textDecoration: "none" }}>
                Cancelar
              </Link>
            </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
