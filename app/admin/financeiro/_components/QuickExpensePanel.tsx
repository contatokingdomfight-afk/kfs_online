"use client";

import { useEffect, useRef, useState, useTransition, useActionState } from "react";
import { Repeat } from "lucide-react";
import { createFinancialExpense, createFinancialExpensesBatch, type ExpenseActionResult } from "../actions";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS_PT } from "@/lib/retail/constants";
import { FINANCE_PAYMENT_METHODS, FINANCE_PAYMENT_METHOD_LABELS_PT } from "@/lib/finance-payment-method";

export type ExpenseTemplate = {
  description: string;
  amount: number;
  category: string;
  kind: string;
  paymentMethod: string;
};

const eur = (n: number) => n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
const toInput = (n: number) => n.toFixed(2).replace(".", ",");
const fromInput = (s: string) => Number(s.replace(",", "."));

type Props = {
  defaultDate: string;
  recent: ExpenseTemplate[];
  fixedToRepeat: ExpenseTemplate[];
  lastMonthLabel: string;
  monthLabel: string;
  monthTotal: number;
};

/** Registo rápido de despesas: uma linha, recentes num toque e «Repetir fixas do mês passado». */
export function QuickExpensePanel({ defaultDate, recent, fixedToRepeat, lastMonthLabel, monthLabel, monthTotal }: Props) {
  const [state, formAction, pending] = useActionState(createFinancialExpense, null as ExpenseActionResult | null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [method, setMethod] = useState("TRANSFER");
  const [fixed, setFixed] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const descRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) {
      setSavedMsg(`Despesa «${description}» lançada.`);
      setDescription("");
      setAmount("");
      setFixed(false);
      setCategory("OTHER");
      descRef.current?.focus();
    }
    // só reage a um novo resultado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function fill(t: ExpenseTemplate) {
    setDescription(t.description);
    setAmount(toInput(t.amount));
    setCategory(t.category);
    setMethod(t.paymentMethod);
    setFixed(t.kind === "FIXED");
    setSavedMsg(null);
  }

  return (
    <section className="card" style={{ padding: "clamp(16px, 4vw, 22px)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, flex: "1 1 200px" }}>
          Nova despesa{" "}
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
            · {monthLabel}: {eur(monthTotal)}
          </span>
        </h2>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="hidden" name="kind" value={fixed ? "FIXED" : "VARIABLE"} />
        <input type="hidden" name="amount" value={amount.trim().replace(",", ".")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: 8 }}>
          <input
            ref={descRef}
            name="description"
            className="input"
            placeholder="Descrição (ex.: renda do espaço)"
            aria-label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            style={{ gridColumn: "span 2", minWidth: 0 }}
          />
          <input className="input" inputMode="decimal" placeholder="Valor (€)" aria-label="Valor" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <select name="category" className="input" aria-label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EXPENSE_CATEGORY_LABELS_PT[c]}
              </option>
            ))}
          </select>
          <select name="paymentMethod" className="input" aria-label="Forma de pagamento" value={method} onChange={(e) => setMethod(e.target.value)}>
            {FINANCE_PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {FINANCE_PAYMENT_METHOD_LABELS_PT[m]}
              </option>
            ))}
          </select>
          <input name="occurredOn" type="date" className="input" aria-label="Data" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} />
            Fixa (repete todos os meses)
          </label>
          <button type="submit" className="btn btn-primary" disabled={pending} style={{ marginLeft: "auto" }}>
            {pending ? "A lançar…" : "Lançar despesa"}
          </button>
        </div>
        {state?.error ? (
          <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>
            {state.error}
          </p>
        ) : savedMsg ? (
          <p role="status" style={{ margin: 0, fontSize: 13, color: "#16a34a" }}>
            {savedMsg}
          </p>
        ) : null}
      </form>

      {recent.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Recentes:</span>
          {recent.map((r) => (
            <button
              key={r.description}
              type="button"
              onClick={() => fill(r)}
              style={{ fontSize: 13, padding: "5px 10px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", cursor: "pointer" }}
            >
              {r.description} · {eur(r.amount)}
            </button>
          ))}
        </div>
      )}

      <RepeatFixed items={fixedToRepeat} lastMonthLabel={lastMonthLabel} defaultDate={defaultDate} />
    </section>
  );
}

function RepeatFixed({ items, lastMonthLabel, defaultDate }: { items: ExpenseTemplate[]; lastMonthLabel: string; defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(() => items.map((i) => ({ ...i, checked: true, amountStr: toInput(i.amount) })));
  const [date, setDate] = useState(defaultDate);
  const [error, setError] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  if (items.length === 0 && doneCount == null) {
    return <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>As despesas fixas de {lastMonthLabel} já estão todas lançadas este mês (ou não há fixas).</p>;
  }
  if (doneCount != null) {
    return (
      <p role="status" style={{ margin: 0, fontSize: 13, color: "#16a34a" }}>
        {doneCount} {doneCount === 1 ? "despesa fixa lançada" : "despesas fixas lançadas"}.
      </p>
    );
  }

  const selected = rows.filter((r) => r.checked);
  const total = selected.reduce((a, r) => a + (fromInput(r.amountStr) || 0), 0);

  function confirm() {
    if (!selected.length) {
      setError("Escolhe pelo menos uma despesa.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createFinancialExpensesBatch(
        selected.map((r) => ({ description: r.description, amount: fromInput(r.amountStr), category: r.category, kind: "FIXED", paymentMethod: r.paymentMethod })),
        date
      );
      if (res.error) setError(res.error);
      else setDoneCount(selected.length);
    });
  }

  if (!open) {
    return (
      <div>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Repeat size={16} aria-hidden /> Repetir fixas de {lastMonthLabel} ({items.length})
        </button>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Fixas de {lastMonthLabel} — revê os valores e confirma</div>
      {rows.map((r, idx) => (
        <label key={r.description + idx} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
          <input type="checkbox" checked={r.checked} onChange={(e) => setRows((rs) => rs.map((x, i) => (i === idx ? { ...x, checked: e.target.checked } : x)))} />
          <span style={{ flex: 1, minWidth: 0 }}>{r.description}</span>
          <input
            className="input"
            inputMode="decimal"
            aria-label={`Valor de ${r.description}`}
            value={r.amountStr}
            onChange={(e) => setRows((rs) => rs.map((x, i) => (i === idx ? { ...x, amountStr: e.target.value } : x)))}
            style={{ width: 96, minHeight: 36 }}
          />
        </label>
      ))}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
          Data
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} style={{ minHeight: 36 }} />
        </label>
        <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700 }}>{eur(total)}</span>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)} disabled={pending}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={confirm} disabled={pending}>
          {pending ? "A lançar…" : `Lançar ${selected.length}`}
        </button>
      </div>
      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
