"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  createProduct,
  addProductVariant,
  createSupplier,
  updateProduct,
  updateSupplier,
  deleteProduct,
  deleteSupplier,
  type ActionResult,
} from "../actions";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS_PT } from "@/lib/retail/constants";
import type { ProductRow, ProductSupplierRow, ProductVariantRow } from "@/lib/retail/types";
import { variantLabel } from "@/lib/retail/catalog";
import styles from "./ProdutosTabs.module.css";

type School = { id: string; name: string };

type TabId = "cadastro" | "catalogo";
type CadastroTipo = "produto" | "fornecedor";

type Props = {
  products: ProductRow[];
  suppliers: ProductSupplierRow[];
  schools: School[];
  variantsByProduct: Record<string, ProductVariantRow[]>;
  productErrorFromUrl?: string | null;
  supplierErrorFromUrl?: string | null;
};

function parseTab(value: string | null): TabId {
  return value === "catalogo" ? "catalogo" : "cadastro";
}

function parseCadastroTipo(value: string | null): CadastroTipo {
  return value === "fornecedor" ? "fornecedor" : "produto";
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {label}
    </button>
  );
}

export function ProdutosManager({
  products,
  suppliers,
  schools,
  variantsByProduct,
  productErrorFromUrl,
  supplierErrorFromUrl,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("aba"));
  const cadastroTipo = parseCadastroTipo(searchParams.get("tipo"));
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  const setTab = useCallback(
    (next: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("aba", next);
      if (next === "catalogo") params.delete("tipo");
      router.replace(`/admin/loja/produtos?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const setCadastroTipo = useCallback(
    (next: CadastroTipo) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("aba", "cadastro");
      params.set("tipo", next);
      router.replace(`/admin/loja/produtos?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const activeProducts = products.filter((p) => p.isActive);
  const supplierNameById = new Map(suppliers.map((s) => [s.id, s.name]));

  return (
    <div>
      <nav className={styles.tabs} aria-label="Secções de produtos">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "cadastro"}
          className={tab === "cadastro" ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setTab("cadastro")}
        >
          Cadastro
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "catalogo"}
          className={tab === "catalogo" ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setTab("catalogo")}
        >
          Catálogo de produtos ({activeProducts.length})
        </button>
      </nav>

      {tab === "cadastro" ? (
        <div role="tabpanel">
          <div className={styles.subTabs} role="tablist" aria-label="Tipo de cadastro">
            <button
              type="button"
              role="tab"
              aria-selected={cadastroTipo === "produto"}
              className={cadastroTipo === "produto" ? `${styles.subTab} ${styles.subTabActive}` : styles.subTab}
              onClick={() => setCadastroTipo("produto")}
            >
              Produto
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={cadastroTipo === "fornecedor"}
              className={cadastroTipo === "fornecedor" ? `${styles.subTab} ${styles.subTabActive}` : styles.subTab}
              onClick={() => setCadastroTipo("fornecedor")}
            >
              Fornecedor
            </button>
          </div>

          {cadastroTipo === "produto" ? (
            <CreateProductForm suppliers={suppliers} schools={schools} />
          ) : (
            <>
              {supplierErrorFromUrl ? (
                <p role="alert" style={{ color: "var(--error)", marginBottom: 12, fontSize: 14 }}>
                  {decodeURIComponent(supplierErrorFromUrl.replace(/\+/g, " "))}
                </p>
              ) : null}
              <CreateSupplierForm />
              <SupplierList
                suppliers={suppliers}
                editingId={editingSupplierId}
                onEdit={setEditingSupplierId}
                onCancelEdit={() => setEditingSupplierId(null)}
              />
            </>
          )}
        </div>
      ) : (
        <div role="tabpanel">
          {productErrorFromUrl ? (
            <p role="alert" style={{ color: "var(--error)", marginBottom: 12, fontSize: 14 }}>
              {decodeURIComponent(productErrorFromUrl.replace(/\+/g, " "))}
            </p>
          ) : null}
          <CatalogSection
            products={products}
            suppliers={suppliers}
            schools={schools}
            variantsByProduct={variantsByProduct}
            supplierNameById={supplierNameById}
            editingProductId={editingProductId}
            onEditProduct={setEditingProductId}
            onCancelEditProduct={() => setEditingProductId(null)}
          />
        </div>
      )}
    </div>
  );
}

function CreateProductForm({ suppliers, schools }: { suppliers: ProductSupplierRow[]; schools: School[] }) {
  const [createState, createAction] = useFormState(createProduct, null as ActionResult | null);
  const createRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (createState?.success) createRef.current?.reset();
  }, [createState]);

  return (
    <form ref={createRef} action={createAction} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Novo produto</h2>
      {createState?.error && <p role="alert" style={{ color: "var(--error)", margin: 0 }}>{createState.error}</p>}
      {createState?.success && <p role="status" style={{ color: "var(--success)", margin: 0 }}>Produto criado.</p>}
      <ProductFields suppliers={suppliers} schools={schools} />
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Variante inicial (obrigatória)</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(120px, 100%), 1fr))", gap: 12 }}>
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
  );
}

function ProductFields({
  suppliers,
  schools,
  product,
}: {
  suppliers: ProductSupplierRow[];
  schools: School[];
  product?: ProductRow;
}) {
  return (
    <>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Nome</span>
        <input name="name" required className="input" defaultValue={product?.name ?? ""} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>SKU produto</span>
          <input name="sku" required className="input" defaultValue={product?.sku ?? ""} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Preço venda (€)</span>
          <input
            name="salePrice"
            type="number"
            min="0"
            step="0.01"
            required
            className="input"
            defaultValue={product?.salePrice ?? ""}
          />
        </label>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Categoria</span>
        <select name="category" className="input" defaultValue={product?.category ?? "ACESSORIO"}>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {PRODUCT_CATEGORY_LABELS_PT[c]}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Fornecedor</span>
          <select name="supplierId" className="input" defaultValue={product?.supplierId ?? ""}>
            <option value="">—</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Escola (opcional)</span>
          <select name="schoolId" className="input" defaultValue={product?.schoolId ?? ""}>
            <option value="">Todas</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}

function CreateSupplierForm() {
  const [state, action] = useFormState(createSupplier, null as ActionResult | null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Novo fornecedor</h2>
      {state?.error && <p role="alert" style={{ color: "var(--error)", margin: 0 }}>{state.error}</p>}
      {state?.success && <p role="status" style={{ color: "var(--success)", margin: 0 }}>Fornecedor criado.</p>}
      <SupplierFields />
      <SubmitBtn label="Adicionar fornecedor" />
    </form>
  );
}

function SupplierFields({ supplier }: { supplier?: ProductSupplierRow }) {
  return (
    <>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Nome</span>
        <input name="name" required className="input" defaultValue={supplier?.name ?? ""} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Contacto</span>
          <input name="contact" className="input" defaultValue={supplier?.contact ?? ""} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>NIF</span>
          <input name="taxId" className="input" defaultValue={supplier?.taxId ?? ""} />
        </label>
      </div>
    </>
  );
}

function SupplierList({
  suppliers,
  editingId,
  onEdit,
  onCancelEdit,
}: {
  suppliers: ProductSupplierRow[];
  editingId: string | null;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
}) {
  if (suppliers.length === 0) {
    return <p style={{ color: "var(--text-secondary)" }}>Sem fornecedores registados.</p>;
  }

  return (
    <section>
      <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Fornecedores ({suppliers.length})</h2>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        {suppliers.map((s) =>
          editingId === s.id ? (
            <li key={s.id}>
              <EditSupplierCard supplier={s} onDone={onCancelEdit} onCancel={onCancelEdit} />
            </li>
          ) : (
            <li key={s.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <strong>{s.name}</strong>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                    {[s.contact, s.taxId ? `NIF ${s.taxId}` : null].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => onEdit(s.id)}>
                    Editar
                  </button>
                  <RemoveSupplierButton supplier={s} />
                </div>
              </div>
            </li>
          )
        )}
      </ul>
    </section>
  );
}

function EditSupplierCard({
  supplier,
  onDone,
  onCancel,
}: {
  supplier: ProductSupplierRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action] = useFormState(updateSupplier, null as ActionResult | null);
  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Editar fornecedor</h3>
      <input type="hidden" name="id" value={supplier.id} />
      {state?.error && <p role="alert" style={{ color: "var(--error)", margin: 0 }}>{state.error}</p>}
      <SupplierFields supplier={supplier} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <SubmitBtn label="Guardar" />
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function RemoveSupplierButton({ supplier }: { supplier: ProductSupplierRow }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button type="button" className="btn" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setConfirm(true)}>
        Remover
      </button>
    );
  }
  return (
    <form action={deleteSupplier} style={{ margin: 0 }}>
      <FormLoadingModal message="A remover fornecedor…" />
      <input type="hidden" name="id" value={supplier.id} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button type="submit" className="btn" style={{ fontSize: 12, padding: "6px 10px", background: "var(--danger)", color: "#fff", border: "none" }}>
          Confirmar
        </button>
        <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => setConfirm(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function CatalogSection({
  products,
  suppliers,
  schools,
  variantsByProduct,
  supplierNameById,
  editingProductId,
  onEditProduct,
  onCancelEditProduct,
}: {
  products: ProductRow[];
  suppliers: ProductSupplierRow[];
  schools: School[];
  variantsByProduct: Record<string, ProductVariantRow[]>;
  supplierNameById: Map<string, string>;
  editingProductId: string | null;
  onEditProduct: (id: string) => void;
  onCancelEditProduct: () => void;
}) {
  const visible = products.filter((p) => p.isActive);

  if (visible.length === 0) {
    return <p style={{ color: "var(--text-secondary)" }}>Sem produtos activos no catálogo.</p>;
  }

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
      {visible.map((p) =>
        editingProductId === p.id ? (
          <li key={p.id}>
            <EditProductCard
              product={p}
              suppliers={suppliers}
              schools={schools}
              onDone={onCancelEditProduct}
              onCancel={onCancelEditProduct}
            />
          </li>
        ) : (
          <li key={p.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong>{p.name}</strong>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                  {p.sku} · {PRODUCT_CATEGORY_LABELS_PT[p.category]} · {p.salePrice.toFixed(2)} €
                  {p.supplierId && supplierNameById.has(p.supplierId) ? ` · ${supplierNameById.get(p.supplierId)}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: "6px 12px" }}
                  onClick={() => onEditProduct(p.id)}
                >
                  Editar
                </button>
                <RemoveProductButton product={p} />
              </div>
            </div>
            <VariantList productId={p.id} variants={variantsByProduct[p.id] ?? []} />
          </li>
        )
      )}
    </ul>
  );
}

function EditProductCard({
  product,
  suppliers,
  schools,
  onDone,
  onCancel,
}: {
  product: ProductRow;
  suppliers: ProductSupplierRow[];
  schools: School[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action] = useFormState(updateProduct, null as ActionResult | null);
  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Editar produto</h3>
      <input type="hidden" name="id" value={product.id} />
      {state?.error && <p role="alert" style={{ color: "var(--error)", margin: 0 }}>{state.error}</p>}
      <ProductFields suppliers={suppliers} schools={schools} product={product} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <SubmitBtn label="Guardar alterações" />
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function RemoveProductButton({ product }: { product: ProductRow }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button type="button" className="btn" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setConfirm(true)}>
        Remover
      </button>
    );
  }
  return (
    <form action={deleteProduct} style={{ margin: 0 }}>
      <FormLoadingModal message="A remover produto…" />
      <input type="hidden" name="id" value={product.id} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button type="submit" className="btn" style={{ fontSize: 12, padding: "6px 10px", background: "var(--danger)", color: "#fff", border: "none" }}>
          Confirmar
        </button>
        <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => setConfirm(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function VariantList({ productId, variants }: { productId: string; variants: ProductVariantRow[] }) {
  const [state, action] = useFormState(addProductVariant, null as ActionResult | null);
  const activeVariants = variants.filter((v) => v.isActive);

  return (
    <div style={{ marginTop: 10 }}>
      <ul style={{ margin: "0 0 10px", paddingLeft: 16, fontSize: 13 }}>
        {activeVariants.map((v) => (
          <li key={v.id}>
            {variantLabel(v)} — {v.sku}
            {v.priceOverride != null ? ` (${v.priceOverride.toFixed(2)} €)` : ""}
          </li>
        ))}
      </ul>
      <form
        action={action}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(90px, 100%), 1fr)) auto",
          gap: 8,
          alignItems: "end",
        }}
      >
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
        <button type="submit" className="btn btn-secondary" style={{ fontSize: 12 }}>
          + Variante
        </button>
      </form>
      {state?.error && <p style={{ color: "var(--error)", fontSize: 12, margin: "4px 0 0" }}>{state.error}</p>}
    </div>
  );
}
