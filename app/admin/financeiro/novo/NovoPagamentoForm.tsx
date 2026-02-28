"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { createPayment, type CreatePaymentResult } from "../actions";

type StudentOption = { id: string; label: string };

export function NovoPagamentoForm({
  studentOptions,
  defaultReferenceMonth,
}: {
  studentOptions: StudentOption[];
  defaultReferenceMonth: string;
}) {
  const [state, formAction] = useFormState(createPayment, null as CreatePaymentResult | null);

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
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Aluno *
        </span>
        <select name="studentId" required className="input">
          <option value="">— Escolher —</option>
          {studentOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Mês de referência (AAAA-MM) *
        </span>
        <input
          type="month"
          name="referenceMonth"
          required
          defaultValue={defaultReferenceMonth}
          className="input"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Valor (€) *
        </span>
        <input
          type="number"
          name="amount"
          required
          min="0"
          step="0.01"
          className="input"
          placeholder="0.00"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Status *
        </span>
        <select name="status" required className="input">
          <option value="PAID">Pago</option>
          <option value="LATE">Em atraso</option>
        </select>
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary">
          Guardar
        </button>
        <Link href="/admin/financeiro" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
