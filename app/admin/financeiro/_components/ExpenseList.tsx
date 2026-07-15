"use client";

import { useMemo, useState } from "react";
import type { FinancialExpenseRow } from "@/lib/admin-finance-overview";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import { paymentMethodLabelPt } from "@/lib/finance-payment-method";
import { EXPENSE_CATEGORY_LABELS_PT } from "@/lib/retail/constants";
import { deleteFinancialExpense } from "../actions";

type Labels = {
  formKindFixed: string;
  formKindVariable: string;
  editExpenseAction: string;
  deleteLabel: string;
  deletingExpenseLabel: string;
  filterSearch: string;
  filterDateFrom: string;
  filterDateTo: string;
  filterAmountMin: string;
  filterAmountMax: string;
  filterClear: string;
  noExpensesFilter: string;
};

type Props = {
  expenses: FinancialExpenseRow[];
  locale: "pt" | "en";
  labels: Labels;
  onEdit: (id: string) => void;
};

function formatMoney(n: number, locale: "pt" | "en") {
  return n.toLocaleString(locale === "en" ? "en-GB" : "pt-PT", {
    style: "currency",
    currency: "EUR",
  });
}

function formatDate(yyyyMmDd: string, locale: "pt" | "en") {
  const d = new Date(yyyyMmDd + "T12:00:00Z");
  return d.toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const chipStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "3px 8px",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--bg-secondary)",
  color: "var(--text-secondary)",
  whiteSpace: "nowrap",
};

function parseAmountInput(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function hasActiveFilters(
  search: string,
  dateFrom: string,
  dateTo: string,
  amountMin: string,
  amountMax: string
) {
  return Boolean(search.trim() || dateFrom || dateTo || amountMin.trim() || amountMax.trim());
}

export function ExpenseList({ expenses, locale, labels, onEdit }: Props) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = parseAmountInput(amountMin);
    const max = parseAmountInput(amountMax);

    return expenses.filter((e) => {
      if (q && !e.description.toLowerCase().includes(q)) return false;
      if (dateFrom && e.occurredOn < dateFrom) return false;
      if (dateTo && e.occurredOn > dateTo) return false;
      if (min !== null && e.amount < min) return false;
      if (max !== null && e.amount > max) return false;
      return true;
    });
  }, [expenses, search, dateFrom, dateTo, amountMin, amountMax]);

  const filtersActive = hasActiveFilters(search, dateFrom, dateTo, amountMin, amountMax);

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
  };

  return (
    <>
      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "minmax(0, 1fr)",
          marginBottom: 12,
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.filterSearch}</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            autoComplete="off"
            style={{ maxWidth: "100%" }}
          />
        </label>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.filterDateFrom}</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input"
              style={{ maxWidth: "100%" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.filterDateTo}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input"
              style={{ maxWidth: "100%" }}
            />
          </label>
        </div>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(min(120px, 100%), 1fr))",
            alignItems: "end",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.filterAmountMin}</span>
            <input
              type="text"
              inputMode="decimal"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              className="input"
              autoComplete="off"
              style={{ maxWidth: "100%" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels.filterAmountMax}</span>
            <input
              type="text"
              inputMode="decimal"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              className="input"
              autoComplete="off"
              style={{ maxWidth: "100%" }}
            />
          </label>
          {filtersActive ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={clearFilters}
              style={{ width: "100%", minHeight: 44 }}
            >
              {labels.filterClear}
            </button>
          ) : null}
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 15, margin: 0 }}>{labels.noExpensesFilter}</p>
      ) : null}

      <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {filteredExpenses.map((e) => (
        <li
          key={e.id}
          className="card"
          style={{
            padding: "clamp(12px, 3vw, 14px)",
            background: "var(--bg)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: "clamp(14px, 3.5vw, 15px)",
                color: "var(--text-primary)",
                wordBreak: "break-word",
                flex: 1,
                minWidth: 0,
                lineHeight: 1.35,
              }}
            >
              {e.description}
            </p>
            <span
              style={{
                fontWeight: 700,
                fontSize: "clamp(14px, 3.5vw, 15px)",
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {formatMoney(e.amount, locale)}
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            <span style={chipStyle}>{formatDate(e.occurredOn, locale)}</span>
            <span style={chipStyle}>{e.kind === "FIXED" ? labels.formKindFixed : labels.formKindVariable}</span>
            <span style={chipStyle}>{EXPENSE_CATEGORY_LABELS_PT[e.category] ?? e.category}</span>
            <span style={chipStyle}>{paymentMethodLabelPt(e.paymentMethod)}</span>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 13, padding: "6px 14px", flex: "1 1 auto", minWidth: 0 }}
              onClick={() => onEdit(e.id)}
            >
              {labels.editExpenseAction}
            </button>
            <form action={deleteFinancialExpense} style={{ margin: 0, flex: "1 1 auto", minWidth: 0 }}>
              <FormLoadingModal message={labels.deletingExpenseLabel} />
              <input type="hidden" name="id" value={e.id} />
              <button
                type="submit"
                className="btn"
                style={{ fontSize: 13, padding: "6px 14px", width: "100%" }}
              >
                {labels.deleteLabel}
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
    </>
  );
}
