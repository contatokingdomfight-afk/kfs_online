"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { COUPON_TARGETS, COUPON_TARGET_LABEL } from "@/lib/coupons/rules";
import { createCouponAdmin, type CouponAdminResult } from "./actions";

const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: "var(--text-secondary)", minWidth: 0 };

export function CouponCreateForm() {
  const [state, action, pending] = useActionState(createCouponAdmin, null as CouponAdminResult | null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state]);

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)} style={{ alignSelf: "flex-start" }}>
        + Novo cupão
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="card" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      <label style={field}>
        Código
        <input name="code" required className="input" placeholder="OUTUBROROSA" autoCapitalize="characters" style={{ textTransform: "uppercase" }} />
      </label>
      <label style={field}>
        Nome interno (opcional)
        <input name="name" className="input" placeholder="Campanha Outubro Rosa" />
      </label>
      <label style={field}>
        Tipo de desconto
        <select name="kind" className="input" defaultValue="PERCENT">
          <option value="PERCENT">Percentagem (%)</option>
          <option value="FIXED">Valor fixo (€)</option>
        </select>
      </label>
      <label style={field}>
        Valor
        <input name="value" required inputMode="decimal" className="input" placeholder="100" />
      </label>
      <fieldset style={{ ...field, gridColumn: "1 / -1", border: 0, padding: 0, margin: 0 }}>
        <legend style={{ marginBottom: 6 }}>Aplica-se a</legend>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "var(--text-primary)", fontSize: 14 }}>
          {COUPON_TARGETS.map((t) => (
            <label key={t} style={{ display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" name="appliesTo" value={t} defaultChecked={t === "ENROLLMENT"} /> {COUPON_TARGET_LABEL[t]}
            </label>
          ))}
        </div>
      </fieldset>
      <label style={field}>
        Início (opcional)
        <input name="startsAt" type="date" className="input" />
      </label>
      <label style={field}>
        Fim (opcional)
        <input name="endsAt" type="date" className="input" />
      </label>
      <label style={field}>
        Nº máximo de pessoas
        <input name="maxRedemptions" required type="number" min={1} step={1} className="input" placeholder="30" />
      </label>
      <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: 12.5, color: "var(--text-secondary)" }}>
        Cada pessoa usa o cupão uma vez. Na mensalidade aplica-se a uma só mensalidade. Para um prémio a um aluno, cria um código único com máximo de 1 pessoa (ex.: PREMIO-JOAO).
      </p>
      {state?.error ? <p style={{ gridColumn: "1 / -1", margin: 0, color: "var(--danger)", fontSize: 13 }}>{state.error}</p> : null}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "A criar…" : "Criar cupão"}
        </button>
      </div>
    </form>
  );
}
