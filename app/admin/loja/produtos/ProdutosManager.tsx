"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createProduct, addProductVariant, createSupplier, type ActionResult } from "../actions";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS_PT } from "@/lib/retail/constants";
import type { ProductRow, ProductSupplierRow, ProductVariantRow } from "@/lib/retail/types";
import { variantLabel } from "@/lib/retail/catalog";

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {label}
    </button>
  );
}

type School = { id: string; name: string };

type Props = {
  products: ProductRow[];
  suppliers: ProductSupplierRow[];
  schools: School[];
  variantsByProduct: Record<string, ProductVariantRow[]>;
};

export function ProdutosManager({ products, suppliers, schools, variantsByProduct }: Props) {
  const [createState, createAction] = useFormState(createProduct, null as ActionResult | null);
  const createRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (createState?.success) createRef.current?.reset();
  }, [createState]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <form ref={createRef} action={createAction} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Novo produto</h2>
        {createState?.error && <p role="alert" style={{ color: "var(--error)", margin: 0 }}>{createState.error}</p>}
        {createState?.success && <p role="status" style={{ color: "var(--success)", margin: 0 }}>Produto criado.</p>}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Nome</span>
          <input name="name" required className="input" />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>SKU produto</span>
            <input name="sku" required className="input" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Preço venda (€)</span>
            <input name="salePrice" type="number" min="0" step="0.01" required className="input" />
          </label>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Categoria</span>
          <select name="category" className="input" defaultValue="ACESSORIO">
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{PRODUCT_CATEGORY_LABELS_PT[c]}</option>
            ))}
          </select>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Fornecedor</span>
            <select name="supplierId" className="input">
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Escola (opcional)</span>
            <select name="schoolId" className="input">
              <option value="">Todas</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Variante inicial (obrigatória)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>SKU variante</span>
            <input name="variantSku" className="input" placeholder="igual ao produto se vazio" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Tamanho</span>
            <input name="size" className="input" placeholder="Único" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Cor</span>
            <input name="color" className="input" />
          </label>
        </div>
        <SubmitBtn label="Criar produto" />
      </form>

      <SupplierForm />

      <section>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Catálogo ({products.length})</h2>
        {products.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>Sem produtos.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
            {products.map((p) => (
              <li key={p.id} className="card" style={{ padding: 14 }}>
                <div>
                  <strong>{p.name}</strong> {!p.isActive && <span style={{ color: "var(--danger)", fontSize: 12 }}>(inactivo)</span>}
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {p.sku} · {PRODUCT_CATEGORY_LABELS_PT[p.category]} · {p.salePrice.toFixed(2)} €
                  </div>
                </div>
                <VariantList productId={p.id} variants={variantsByProduct[p.id] ?? []} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SupplierForm() {
  const [state, action] = useFormState(createSupplier, null as ActionResult | null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Novo fornecedor</h2>
      {state?.error && <p role="alert" style={{ color: "var(--error)", margin: 0 }}>{state.error}</p>}
      {state?.success && <p role="status" style={{ color: "var(--success)", margin: 0 }}>Fornecedor criado.</p>}
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Nome</span>
        <input name="name" required className="input" />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Contacto</span>
          <input name="contact" className="input" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>NIF</span>
          <input name="taxId" className="input" />
        </label>
      </div>
      <SubmitBtn label="Adicionar fornecedor" />
    </form>
  );
}

function VariantList({ productId, variants }: { productId: string; variants: ProductVariantRow[] }) {
  const [state, action] = useFormState(addProductVariant, null as ActionResult | null);
  return (
    <div style={{ marginTop: 10 }}>
      <ul style={{ margin: "0 0 10px", paddingLeft: 16, fontSize: 13 }}>
        {variants.map((v) => (
          <li key={v.id}>
            {variantLabel(v)} — {v.sku}
            {v.priceOverride != null ? ` (${v.priceOverride.toFixed(2)} €)` : ""}
          </li>
        ))}
      </ul>
      <form action={action} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
        <input type="hidden" name="productId" value={productId} />
        <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>SKU</span>
          <input name="sku" required className="input" style={{ fontSize: 13 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Tamanho</span>
          <input name="size" className="input" style={{ fontSize: 13 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Cor</span>
          <input name="color" className="input" style={{ fontSize: 13 }} />
        </label>
        <button type="submit" className="btn btn-secondary" style={{ fontSize: 12 }}>+ Variante</button>
      </form>
      {state?.error && <p style={{ color: "var(--error)", fontSize: 12, margin: "4px 0 0" }}>{state.error}</p>}
    </div>
  );
}
