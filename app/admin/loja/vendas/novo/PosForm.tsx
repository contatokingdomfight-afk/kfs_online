"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { registerRetailSale, searchStudentsForRetail, searchVariantsAction, type ActionResult } from "../../actions";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS_PT } from "@/lib/retail/constants";
import { variantLabel } from "@/lib/retail/catalog";
import type { VariantWithProduct } from "@/lib/retail/types";
import { blurActiveElementBeforeSubmit } from "@/lib/blur-before-form-submit";

type School = { id: string; name: string };

type CartLine = {
  variantId: string;
  label: string;
  unitPrice: number;
  quantity: number;
};

function SubmitSale({ total }: { total: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn-primary mobile-form-sticky-actions"
      disabled={pending}
      style={{ width: "100%", fontSize: 18, padding: "14px 20px" }}
    >
      {pending ? "A registar…" : `Registar venda — ${total.toFixed(2)} €`}
    </button>
  );
}

export function PosForm({ schools }: { schools: School[] }) {
  const [state, formAction] = useFormState(registerRetailSale, null as ActionResult | null);
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [query, setQuery] = useState("");
  const [variants, setVariants] = useState<VariantWithProduct[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentLabel, setStudentLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [searchPending, startSearch] = useTransition();
  const [studentPending, startStudentSearch] = useTransition();

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    [cart]
  );

  const runSearch = useCallback(() => {
    startSearch(async () => {
      const res = await searchVariantsAction(query);
      setVariants(res.variants ?? []);
    });
  }, [query]);

  const runStudentSearch = useCallback(() => {
    startStudentSearch(async () => {
      const res = await searchStudentsForRetail(studentQuery);
      if (res.results?.length === 1) {
        setStudentId(res.results[0].id);
        setStudentLabel(res.results[0].name);
      } else if (res.results?.length) {
        setStudentId(res.results[0].id);
        setStudentLabel(res.results.map((r) => r.name).join(" · "));
      }
    });
  }, [studentQuery]);

  function addToCart(v: VariantWithProduct) {
    setCart((prev) => {
      const existing = prev.find((l) => l.variantId === v.id);
      if (existing) {
        return prev.map((l) => (l.variantId === v.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          variantId: v.id,
          label: `${v.productName} — ${variantLabel(v)}`,
          unitPrice: v.effectivePrice,
          quantity: 1,
        },
      ];
    });
    setQuery("");
    setVariants([]);
  }

  function updateQty(variantId: string, quantity: number) {
    if (quantity < 1) {
      setCart((prev) => prev.filter((l) => l.variantId !== variantId));
      return;
    }
    setCart((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, quantity } : l)));
  }

  return (
    <form
      action={formAction}
      onSubmit={blurActiveElementBeforeSubmit}
      className="mobile-form-field-scroll"
      style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 80 }}
    >
      <input type="hidden" name="schoolId" value={schoolId} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="lines" value={JSON.stringify(cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPrice: l.unitPrice })))} />

      {state?.error && (
        <p role="alert" className="card" style={{ padding: 12, color: "var(--error)", margin: 0 }}>
          {state.error}
        </p>
      )}

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Escola</span>
        <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="input" required>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>

      <div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Pesquisar artigo</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input"
              placeholder="Nome ou SKU"
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-secondary" onClick={runSearch} disabled={searchPending}>
              {searchPending ? "…" : "Buscar"}
            </button>
          </div>
        </label>
        {variants.length > 0 && (
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {variants.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: "100%", textAlign: "left", fontSize: 14 }}
                  onClick={() => addToCart(v)}
                >
                  {v.productName} — {variantLabel(v)} · {v.effectivePrice.toFixed(2)} €
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="card" style={{ padding: 14 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600 }}>Carrinho</h2>
        {cart.length === 0 ? (
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>Adiciona artigos acima.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {cart.map((l) => (
              <li key={l.variantId} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{ flex: 1, minWidth: 120, fontSize: 14 }}>{l.label}</span>
                <input
                  type="number"
                  min={1}
                  value={l.quantity}
                  onChange={(e) => updateQty(l.variantId, parseInt(e.target.value, 10) || 0)}
                  className="input"
                  style={{ width: 64 }}
                  aria-label="Quantidade"
                />
                <span style={{ fontWeight: 600 }}>{(l.unitPrice * l.quantity).toFixed(2)} €</span>
                <button type="button" className="btn" style={{ fontSize: 12 }} onClick={() => updateQty(l.variantId, 0)}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m}
            type="button"
            className={paymentMethod === m ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setPaymentMethod(m)}
            style={{ fontSize: 14 }}
          >
            {PAYMENT_METHOD_LABELS_PT[m]}
          </button>
        ))}
      </div>

      <div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Aluno (opcional)</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              className="input"
              placeholder="Nome ou email"
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-secondary" onClick={runStudentSearch} disabled={studentPending}>
              {studentPending ? "…" : "Ligar"}
            </button>
          </div>
        </label>
        {studentLabel && (
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
            Seleccionado: {studentLabel}{" "}
            <button type="button" style={{ fontSize: 12 }} onClick={() => { setStudentId(""); setStudentLabel(""); setStudentQuery(""); }}>
              limpar
            </button>
          </p>
        )}
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Notas</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input" />
      </label>

      {cart.length > 0 && <SubmitSale total={total} />}
    </form>
  );
}
