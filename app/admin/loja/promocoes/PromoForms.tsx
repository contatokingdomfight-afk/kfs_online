"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createCoupon, createPromotion, type PromoActionResult } from "./actions";

const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const lbl: React.CSSProperties = { fontSize: 13, color: "var(--text-secondary)" };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} style={{ minHeight: 42 }}>
      {pending ? "A guardar…" : label}
    </button>
  );
}

function useResetOnSuccess(state: PromoActionResult | null) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);
  return ref;
}

export function PromotionForm({ products }: { products: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createPromotion, null as PromoActionResult | null);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Nova promoção</h2>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Aplica-se sozinha quando a encomenda tem pelo menos N peças.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: 12 }}>
        <label style={{ ...field, gridColumn: "1 / -1" }}>
          <span style={lbl}>Nome (aparece ao aluno)</span>
          <input name="name" className="input" required placeholder="Ex.: Promoção 2+ camisetas" />
        </label>
        <label style={field}>
          <span style={lbl}>Vale para</span>
          <select name="productId" className="input" defaultValue="">
            <option value="">Toda a loja</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label style={field}>
          <span style={lbl}>A partir de (peças)</span>
          <input name="minQuantity" type="number" min={2} step={1} defaultValue={2} className="input" required />
        </label>
        <label style={field}>
          <span style={lbl}>Desconto (%)</span>
          <input name="percentOff" type="number" min={1} max={90} step="0.5" defaultValue={10} className="input" required />
        </label>
      </div>
      {state?.error ? <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{state.error}</p> : null}
      {state?.success ? <p role="status" style={{ margin: 0, color: "var(--success)", fontSize: 14 }}>Promoção criada e ativa.</p> : null}
      <Submit label="Criar promoção" />
    </form>
  );
}

export function CouponForm() {
  const [state, action] = useActionState(createCoupon, null as PromoActionResult | null);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Novo cupão</h2>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>O aluno escreve o código na encomenda. Desliga-o quando quiseres acabar com ele.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: 12 }}>
        <label style={field}>
          <span style={lbl}>Código</span>
          <input name="code" className="input" required placeholder="Ex.: KFS10" maxLength={30} style={{ textTransform: "uppercase" }} />
        </label>
        <label style={field}>
          <span style={lbl}>Tipo</span>
          <select name="kind" className="input" defaultValue="PERCENT">
            <option value="PERCENT">Percentagem (%)</option>
            <option value="FIXED">Valor fixo (€)</option>
          </select>
        </label>
        <label style={field}>
          <span style={lbl}>Valor</span>
          <input name="value" type="number" min="0.5" step="0.5" defaultValue={10} className="input" required />
        </label>
      </div>
      {state?.error ? <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{state.error}</p> : null}
      {state?.success ? <p role="status" style={{ margin: 0, color: "var(--success)", fontSize: 14 }}>Cupão criado e ativo.</p> : null}
      <Submit label="Criar cupão" />
    </form>
  );
}
