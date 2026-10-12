"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { PreorderProduct } from "@/lib/retail/orders";
import { imageForColor } from "@/lib/retail/product-images";
import { computeDiscount, type CouponRule, type PromotionRule } from "@/lib/retail/discounts";

type Result = { error?: string; success?: boolean } | null;
type Line = { key: string; productId: string; variantId: string; quantity: number; recipientNote: string };

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
const sizeRank = (s: string) => {
  const i = SIZE_ORDER.indexOf(s.toUpperCase());
  return i === -1 ? 100 : i;
};

function euro(n: number): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;
}

const chip = (on: boolean): React.CSSProperties => ({
  minWidth: 46,
  minHeight: 40,
  padding: "0 12px",
  borderRadius: 10,
  border: on ? "2px solid var(--primary)" : "1px solid var(--border)",
  background: "var(--bg-secondary)",
  color: "var(--text-primary)",
  font: "inherit",
  fontSize: 14,
  fontWeight: on ? 800 : 600,
  cursor: "pointer",
});

const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" };

function SubmitButton({ disabled, label: text }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={disabled || pending} style={{ minHeight: 50, fontSize: 16, fontWeight: 700 }}>
      {pending ? "A enviar…" : text}
    </button>
  );
}

/**
 * Montar uma encomenda: cor + tamanho + quantidade + «para quem» → linhas → enviar.
 * Serve ao aluno (Loja) e ao admin (encomenda para quem não tem conta, com `extraFields`).
 */
export function OrderBuilder({
  products,
  action,
  submitLabel,
  footerNote,
  extraFields,
  promotions = [],
  checkCoupon,
}: {
  products: PreorderProduct[];
  action: (prev: Result, formData: FormData) => Promise<Result>;
  submitLabel: string;
  footerNote?: ReactNode;
  extraFields?: ReactNode;
  /** Promoções ativas (pré-visualização; o servidor recalcula ao enviar). */
  promotions?: PromotionRule[];
  /** Valida o cupão no servidor; sem isto não aparece o campo do cupão. */
  checkCoupon?: (code: string) => Promise<{ coupon?: CouponRule; error?: string }>;
}) {
  const [state, formAction] = useActionState(action, null as Result);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((p) => p.id === productId) ?? products[0];
  const colors = useMemo(() => [...new Set((product?.variants ?? []).map((v) => v.color ?? ""))], [product]);
  const [color, setColor] = useState(colors.length === 1 ? colors[0] : "");
  const sizes = useMemo(
    () =>
      [...new Set((product?.variants ?? []).filter((v) => (v.color ?? "") === color || colors.length <= 1).map((v) => v.size ?? ""))].sort(
        (a, b) => sizeRank(a) - sizeRank(b) || a.localeCompare(b)
      ),
    [product, color, colors.length]
  );
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  /** Foto escolhida à mão na galeria (senão segue a cor). */
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponRule | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Encomenda registada (admin): limpa o formulário para a próxima.
  useEffect(() => {
    if (state?.success) {
      setLines([]);
      setCoupon(null);
      setCouponInput("");
      formRef.current?.reset();
    }
  }, [state]);

  const variant = product?.variants.find((v) => (v.color ?? "") === (colors.length <= 1 ? colors[0] ?? "" : color) && (v.size ?? "") === size);
  const needsColor = colors.length > 1 && colors.some(Boolean);
  const needsSize = sizes.length > 1 || (sizes.length === 1 && sizes[0] !== "");

  const allVariants = new Map(products.flatMap((p) => p.variants.map((v) => [v.id, { ...v, productName: p.name }] as const)));
  const preview = computeDiscount(
    lines.map((l) => ({ productId: l.productId, quantity: l.quantity, lineTotal: (allVariants.get(l.variantId)?.price ?? 0) * l.quantity })),
    promotions,
    coupon
  );
  const total = preview.total;

  async function applyCoupon() {
    if (!checkCoupon || !couponInput.trim()) return;
    setChecking(true);
    setCouponMsg(null);
    const r = await checkCoupon(couponInput);
    setChecking(false);
    if (r.coupon) setCoupon(r.coupon);
    else {
      setCoupon(null);
      setCouponMsg(r.error ?? "Cupão inválido.");
    }
  }

  function chooseProduct(id: string) {
    setProductId(id);
    setPickedImage(null);
    const p = products.find((x) => x.id === id);
    const cs = [...new Set((p?.variants ?? []).map((v) => v.color ?? ""))];
    setColor(cs.length === 1 ? cs[0] : "");
    setSize("");
  }

  function addLine() {
    const sizeValue = needsSize ? size : sizes[0] ?? "";
    const v = product?.variants.find((x) => (x.color ?? "") === (needsColor ? color : colors[0] ?? "") && (x.size ?? "") === sizeValue);
    if (needsColor && !color) return setHint("Escolhe a cor.");
    if (needsSize && !size) return setHint("Escolhe o tamanho.");
    if (!v) return setHint("Esta combinação não está disponível.");
    setHint(null);
    setLines((ls) => [...ls, { key: crypto.randomUUID(), productId: product!.id, variantId: v.id, quantity: qty, recipientNote: note.trim() }]);
    setQty(1);
    setNote("");
    setSize("");
  }

  if (!product) return <p style={{ color: "var(--text-secondary)" }}>Não há produtos em pré-encomenda de momento.</p>;

  return (
    <form ref={formRef} action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="couponCode" value={coupon?.code ?? ""} />
      <input type="hidden" name="lines" value={JSON.stringify(lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, recipientNote: l.recipientNote || null })))} />

      {extraFields}

      <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {product.images.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto do bucket público */}
            <img
              src={pickedImage ?? imageForColor(product.images, needsColor ? color : colors[0]) ?? product.images[0].url}
              alt={product.name}
              style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 14, background: "#fff", display: "block" }}
            />
            {product.images.length > 1 && (
              <div style={{ display: "flex", gap: 8 }}>
                {product.images.map((img) => (
                  <button
                    key={img.url}
                    type="button"
                    aria-label={img.color ? `Foto ${img.color}` : "Foto"}
                    onClick={() => {
                      setPickedImage(img.url);
                      if (img.color && colors.includes(img.color)) {
                        setColor(img.color);
                        setSize("");
                      }
                    }}
                    style={{ width: 58, height: 58, padding: 0, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", background: "#fff", cursor: "pointer" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- miniatura */}
                    <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {products.length > 1 && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={label}>Artigo</span>
            <select className="input" value={productId} onChange={(e) => chooseProduct(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {needsColor && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={label}>Cor</span>
            <div role="radiogroup" aria-label="Cor" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {colors.map((c) => (
                <button key={c || "-"} type="button" role="radio" aria-checked={c === color} onClick={() => { setColor(c); setSize(""); setPickedImage(null); }} style={chip(c === color)}>
                  {c || "—"}
                </button>
              ))}
            </div>
          </div>
        )}

        {needsSize && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={label}>Tamanho</span>
            <div role="radiogroup" aria-label="Tamanho" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {sizes.map((s) => (
                <button key={s || "-"} type="button" role="radio" aria-checked={s === size} onClick={() => setSize(s)} disabled={needsColor && !color} style={{ ...chip(s === size), opacity: needsColor && !color ? 0.5 : 1 }}>
                  {s || "Único"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={label}>Quantidade</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button type="button" aria-label="Menos" onClick={() => setQty((q) => Math.max(1, q - 1))} style={chip(false)}>
                <Minus size={16} aria-hidden />
              </button>
              <span style={{ minWidth: 28, textAlign: "center", fontSize: 17, fontWeight: 800 }}>{qty}</span>
              <button type="button" aria-label="Mais" onClick={() => setQty((q) => Math.min(20, q + 1))} style={chip(false)}>
                <Plus size={16} aria-hidden />
              </button>
            </div>
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 180 }}>
            <span style={label}>
              Para quem <span style={{ fontWeight: 400 }}>(opcional)</span>
            </span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder="Ex.: irmão, amigo João" />
          </label>
        </div>

        {hint && (
          <p role="alert" style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>
            {hint}
          </p>
        )}
        <button type="button" className="btn btn-secondary" onClick={addLine} style={{ minHeight: 46, fontWeight: 700 }}>
          Adicionar à encomenda{variant ? ` · ${euro(variant.price * qty)}` : ""}
        </button>
      </section>

      <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>A encomenda</h2>
        {lines.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Ainda sem peças. Escolhe acima e carrega em «Adicionar à encomenda».</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {lines.map((l) => {
              const v = allVariants.get(l.variantId);
              return (
                <li key={l.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg)" }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>
                      {l.quantity > 1 ? `${l.quantity}× ` : ""}
                      {v?.productName} · {[v?.color, v?.size].filter(Boolean).join(" · ") || "Único"}
                    </span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>{l.recipientNote ? `para: ${l.recipientNote}` : "para mim"}</span>
                  </span>
                  <strong style={{ fontSize: 14 }}>{euro((v?.price ?? 0) * l.quantity)}</strong>
                  <button type="button" aria-label="Remover" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} style={{ ...chip(false), minWidth: 40, padding: 0 }}>
                    <Trash2 size={16} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {checkCoupon && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {coupon ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <span style={{ flex: 1 }}>
                  Cupão <strong>{coupon.code}</strong> aplicado
                </span>
                <button type="button" onClick={() => { setCoupon(null); setCouponInput(""); }} style={{ ...chip(false), minHeight: 32, fontSize: 12 }}>
                  Remover
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="input"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void applyCoupon();
                    }
                  }}
                  placeholder="Tenho um cupão"
                  aria-label="Código do cupão"
                  maxLength={30}
                  style={{ flex: 1, textTransform: "uppercase" }}
                />
                <button type="button" onClick={() => void applyCoupon()} disabled={checking || !couponInput.trim()} style={{ ...chip(false), minHeight: 44 }}>
                  {checking ? "…" : "Aplicar"}
                </button>
              </div>
            )}
            {couponMsg ? <span role="alert" style={{ fontSize: 13, color: "var(--danger)" }}>{couponMsg}</span> : null}
          </div>
        )}
        {preview.discount > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--text-secondary)" }}>
              <span>Subtotal</span>
              <span>{euro(preview.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, color: "var(--success)", fontWeight: 700 }}>
              <span>{preview.label}</span>
              <span>−{euro(preview.discount)}</span>
            </div>
            {preview.note ? <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{preview.note}</span> : null}
          </>
        )}
        {promotions.length > 0 && preview.discount === 0 && (
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {promotions.map((p) => `${p.name}: ${p.percentOff}% a partir de ${p.minQuantity} peças`).join(" · ")}
          </span>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, paddingTop: 4 }}>
          <span>Total</span>
          <span>{euro(total)}</span>
        </div>
        {footerNote}
        {state?.success && (
          <p role="status" style={{ margin: 0, fontSize: 14, color: "var(--success)", fontWeight: 700 }}>
            Encomenda registada.
          </p>
        )}
        {state?.error && (
          <p role="alert" style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>
            {state.error}
          </p>
        )}
        <SubmitButton disabled={lines.length === 0} label={submitLabel} />
      </section>
    </form>
  );
}
