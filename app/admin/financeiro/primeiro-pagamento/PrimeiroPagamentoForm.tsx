"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import {
  createFirstPayment,
  searchStudentsForPayment,
  type CreateFirstPaymentResult,
  type StudentPaymentRow,
} from "../actions";
import { blurActiveElementBeforeSubmit } from "@/lib/blur-before-form-submit";
import { PaymentMethodSelect } from "@/components/admin/PaymentMethodSelect";

type Props = {
  defaultReferenceMonth: string;
  defaultReferenceYear: string;
  initialStudent?: StudentPaymentRow | null;
};

export function PrimeiroPagamentoForm({
  defaultReferenceMonth,
  defaultReferenceYear,
  initialStudent = null,
}: Props) {
  const [state, formAction] = useFormState(createFirstPayment, null as CreateFirstPaymentResult | null);
  const [referenceMonth, setReferenceMonth] = useState(defaultReferenceMonth);
  const [referenceYear, setReferenceYear] = useState(defaultReferenceYear);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<StudentPaymentRow[]>([]);
  const [selected, setSelected] = useState<StudentPaymentRow | null>(initialStudent);
  const [includeEnrollment, setIncludeEnrollment] = useState(
    initialStudent?.onboardingFees.showEnrollment ?? true
  );
  const [includeInsurance, setIncludeInsurance] = useState(
    initialStudent?.onboardingFees.showInsurance ?? true
  );
  const [tuitionAmount, setTuitionAmount] = useState(() => {
    if (!initialStudent) return "";
    if (initialStudent.existingPayment && initialStudent.existingPayment.amount > 0) {
      return String(initialStudent.existingPayment.amount);
    }
    return initialStudent.priceMonthly > 0 ? String(initialStudent.priceMonthly) : "";
  });
  const [tuitionMonths, setTuitionMonths] = useState(1);

  const fees = selected?.onboardingFees;
  const showEnrollment = fees?.showEnrollment ?? false;
  const showInsurance = fees?.showInsurance ?? false;

  const tuition = parseFloat(tuitionAmount || (selected?.priceMonthly ? String(selected.priceMonthly) : "0"));
  const tuitionTotal = Number.isNaN(tuition) ? 0 : tuition * tuitionMonths;
  const enrollmentPart = includeEnrollment && showEnrollment ? (fees?.enrollmentAmount ?? 0) : 0;
  const insurancePart = includeInsurance && showInsurance ? (fees?.insuranceAmount ?? 0) : 0;
  const total = useMemo(
    () => tuitionTotal + enrollmentPart + insurancePart,
    [tuitionTotal, enrollmentPart, insurancePart]
  );

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSearchError(null);
      setResults([]);
      setSearching(true);
      try {
        const res = await searchStudentsForPayment(query, referenceMonth);
        if ("error" in res) {
          setSearchError(res.error);
        } else {
          const eligible = res.results.filter((r) => r.isFirstPaymentEligible || r.hasPendingOnboarding);
          setResults(eligible);
          if (eligible.length === 0) {
            setSearchError(
              res.results.length > 0
                ? "Os alunos encontrados já têm pagamentos. Usa «Registar pagamento» normal."
                : "Nenhum aluno encontrado."
            );
          }
        }
      } finally {
        setSearching(false);
      }
    },
    [query, referenceMonth]
  );

  const selectStudent = (row: StudentPaymentRow) => {
    setSelected(row);
    setIncludeEnrollment(row.onboardingFees.showEnrollment);
    setIncludeInsurance(row.onboardingFees.showInsurance);
    const tuitionDefault =
      row.existingPayment && row.existingPayment.amount > 0
        ? String(row.existingPayment.amount)
        : row.priceMonthly > 0
          ? String(row.priceMonthly)
          : "";
    setTuitionAmount(tuitionDefault);
    setSearchError(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 560 }}>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
        Regista o <strong>primeiro pagamento</strong> após a inscrição: mensalidade do mês, matrícula (podes isentar) e
        seguro anual (podes dispensar).
      </p>

      {!selected ? (
        <>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14 }}>Mês da primeira mensalidade</label>
            <input
              type="month"
              value={referenceMonth}
              onChange={(e) => setReferenceMonth(e.target.value)}
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
            <button type="submit" className="btn btn-secondary" disabled={searching || query.trim().length < 2}>
              {searching ? "A pesquisar…" : "Pesquisar"}
            </button>
          </form>
          {searchError && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{searchError}</p>}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {results.map((r) => (
              <li key={r.studentId} className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 600 }}>
                  {r.name || "—"} <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>{r.email}</span>
                </div>
                <div style={{ fontSize: 13, marginTop: 6, color: "var(--text-secondary)" }}>
                  Plano: {r.planName ?? "—"}
                  {r.priceMonthly > 0 && <> · {r.priceMonthly.toFixed(2)} €/mês</>}
                  {r.hasPendingOnboarding && (
                    <span style={{ display: "block", color: "var(--primary)", fontWeight: 500, marginTop: 4 }}>
                      Pagamentos de inscrição pendentes
                    </span>
                  )}
                </div>
                <button type="button" className="btn btn-primary" style={{ marginTop: 10, fontSize: 14 }} onClick={() => selectStudent(r)}>
                  Selecionar
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <strong>{selected.name}</strong>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{selected.email}</div>
            </div>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setSelected(null)}>
              ← Outro aluno
            </button>
          </div>

          <form
            action={formAction}
            onSubmit={blurActiveElementBeforeSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <input type="hidden" name="studentId" value={selected.studentId} />
            <input type="hidden" name="referenceMonth" value={referenceMonth} />
            {showInsurance ? (
              <>
                {includeInsurance && <input type="hidden" name="includeInsurance" value="on" />}
                <input type="hidden" name="referenceYear" value={referenceYear} />
              </>
            ) : null}

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Mensalidade (€) / mês</span>
              <input
                type="number"
                name="tuitionAmount"
                min="0"
                step="0.01"
                required
                className="input mobile-form-field-scroll"
                value={tuitionAmount}
                onChange={(e) => setTuitionAmount(e.target.value)}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Meses de mensalidade</span>
              <input
                type="number"
                name="tuitionMonths"
                min={1}
                max={12}
                value={tuitionMonths}
                onChange={(e) => setTuitionMonths(parseInt(e.target.value, 10) || 1)}
                className="input mobile-form-field-scroll"
                style={{ maxWidth: 120 }}
              />
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Padrão: 1. Inclui o mês de referência e meses seguintes (só mensalidade).
              </span>
            </label>

            <fieldset style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 14, margin: 0 }}>
              <legend style={{ fontSize: 14, fontWeight: 600, padding: "0 6px" }}>Taxas de inscrição</legend>

              {showEnrollment ? (
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    name="includeEnrollment"
                    checked={includeEnrollment}
                    onChange={(e) => setIncludeEnrollment(e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span style={{ fontSize: 14 }}>
                    <strong>Matrícula</strong> — {(fees?.enrollmentAmount ?? 0).toFixed(2)} €
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      Desmarca para oferecer a matrícula ao aluno.
                    </span>
                  </span>
                </label>
              ) : (
                <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-secondary)" }}>
                  Matrícula já paga ou isenta.
                </p>
              )}

              {showInsurance ? (
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeInsurance}
                    onChange={(e) => setIncludeInsurance(e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span style={{ fontSize: 14 }}>
                    <strong>Seguro anual</strong> — {(fees?.insuranceAmount ?? 0).toFixed(2)} € ({referenceYear})
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      Desmarca para dispensar o seguro deste aluno (ex.: já tem seguro próprio).
                    </span>
                  </span>
                </label>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Seguro deste ano já registado.</p>
              )}
            </fieldset>

            {!showInsurance && (
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Ano do seguro</span>
                <input
                  type="number"
                  name="referenceYear"
                  min="2020"
                  max="2100"
                  className="input"
                  value={referenceYear}
                  onChange={(e) => setReferenceYear(e.target.value)}
                />
              </label>
            )}

            <div
              style={{
                padding: "12px 14px",
                background: "var(--surface)",
                borderRadius: "var(--radius-md)",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Total: {total.toFixed(2)} €
            </div>

            <PaymentMethodSelect label="Forma de pagamento" />

            {state?.error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{state.error}</p>}

            <div className="mobile-form-sticky-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-primary">
                Registar primeiro pagamento
              </button>
              <Link href="/admin/financeiro" className="btn btn-secondary" style={{ textDecoration: "none" }}>
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
