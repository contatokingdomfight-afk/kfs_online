"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { recordStockIn, recordStockAdjust, type ActionResult } from "../actions";
import type { StockMovementRow } from "@/lib/retail/types";

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {label}
    </button>
  );
}

type School = { id: string; name: string };
type VariantOption = { id: string; label: string };

type Props = {
  schools: School[];
  variants: VariantOption[];
  movements: StockMovementRow[];
};

export function StockManager({ schools, variants, movements }: Props) {
  const [inState, inAction] = useFormState(recordStockIn, null as ActionResult | null);
  const [adjState, adjAction] = useFormState(recordStockAdjust, null as ActionResult | null);
  const inRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (inState?.success) inRef.current?.reset();
  }, [inState]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <form ref={inRef} action={inAction} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Entrada de stock</h2>
        {inState?.error && <p role="alert" style={{ color: "var(--error)", margin: 0 }}>{inState.error}</p>}
        {inState?.success && <p role="status" style={{ color: "var(--success)", margin: 0 }}>Stock actualizado.</p>}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Variante</span>
          <select name="variantId" required className="input">
            <option value="">—</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Escola</span>
          <select name="schoolId" required className="input">
            <option value="">—</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Quantidade</span>
            <input name="quantity" type="number" min="1" required className="input" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Custo unit. (€)</span>
            <input name="unitCost" type="number" min="0" step="0.01" className="input" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Stock mínimo</span>
            <input name="reorderLevel" type="number" min="0" className="input" placeholder="alerta" />
          </label>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Notas</span>
          <input name="notes" className="input" />
        </label>
        <SubmitBtn label="Registar entrada" />
      </form>

      <form action={adjAction} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Ajuste de inventário</h2>
        {adjState?.error && <p role="alert" style={{ color: "var(--error)", margin: 0 }}>{adjState.error}</p>}
        {adjState?.success && <p role="status" style={{ color: "var(--success)", margin: 0 }}>Inventário ajustado.</p>}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Variante</span>
          <select name="variantId" required className="input">
            <option value="">—</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Escola</span>
          <select name="schoolId" required className="input">
            <option value="">—</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Quantidade real (após contagem)</span>
          <input name="newQuantity" type="number" min="0" required className="input" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Notas</span>
          <input name="notes" className="input" />
        </label>
        <SubmitBtn label="Ajustar stock" />
      </form>

      <section className="card" style={{ padding: 16 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Movimentos recentes</h2>
        {movements.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>Sem movimentos.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--card-border)" }}>
                  <th style={{ padding: 8 }}>Data</th>
                  <th style={{ padding: 8 }}>Tipo</th>
                  <th style={{ padding: 8 }}>Artigo</th>
                  <th style={{ padding: 8 }}>Escola</th>
                  <th style={{ padding: 8 }}>Qtd</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} style={{ borderTop: "1px solid var(--card-border)" }}>
                    <td style={{ padding: 8, whiteSpace: "nowrap" }}>{new Date(m.createdAt).toLocaleString("pt-PT")}</td>
                    <td style={{ padding: 8 }}>{m.movementType}</td>
                    <td style={{ padding: 8 }}>{m.productName ?? m.variantSku ?? m.variantId}</td>
                    <td style={{ padding: 8 }}>{m.schoolName ?? m.schoolId}</td>
                    <td style={{ padding: 8 }}>{m.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
