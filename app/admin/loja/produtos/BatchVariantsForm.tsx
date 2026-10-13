"use client";

import { useActionState, useMemo, useState } from "react";
import { createVariantsBatch, type ActionResult } from "../actions";
import { buildCombos, comboKey, splitList } from "@/lib/retail/variant-batch";
import type { ProductVariantRow } from "@/lib/retail/types";

type Group = { id: number; fit: string; sizes: string; price: string };

const FIT_PRESETS = ["Masculino", "Feminino", "Infantil"];
const SIZE_PRESETS = [
  { label: "Adulto", value: "XS S M L XL XXL" },
  { label: "Infantil", value: "4 6 8 10 12 14" },
];

const small = { fontSize: 11, color: "var(--text-secondary)" } as const;
let nextId = 1;

export function BatchVariantsForm({ productId, variants }: { productId: string; variants: ProductVariantRow[] }) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([{ id: nextId++, fit: "", sizes: "", price: "" }]);
  const [colors, setColors] = useState("");
  const [state, action] = useActionState(createVariantsBatch, null as ActionResult | null);

  const batch = useMemo(
    () => ({
      colors: splitList(colors),
      groups: groups.map((g) => ({
        fit: g.fit,
        sizes: splitList(g.sizes),
        price: g.price.trim() && Number.isFinite(parseFloat(g.price.replace(",", "."))) ? parseFloat(g.price.replace(",", ".")) : null,
      })),
    }),
    [groups, colors]
  );
  const combos = useMemo(() => buildCombos(batch), [batch]);
  const have = useMemo(() => new Set(variants.filter((v) => v.isActive).map((v) => comboKey(v))), [variants]);
  const fresh = combos.filter((c) => !have.has(comboKey(c))).length;

  const update = (id: number, patch: Partial<Group>) => setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" style={{ fontSize: 13, marginBottom: 10 }} onClick={() => setOpen(true)}>
        + Criar variantes em lote
      </button>
    );
  }

  return (
    <form
      action={action}
      style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="batch" value={JSON.stringify(batch)} />
      <strong style={{ fontSize: 14 }}>Variantes em lote</strong>

      {groups.map((g) => (
        <div key={g.id} style={{ display: "grid", gap: 6, padding: 10, borderRadius: 10, background: "var(--surface-2, rgba(255,255,255,0.04))" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px auto", gap: 8, alignItems: "end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={small}>Versão</span>
              <input className="input" style={{ fontSize: 13 }} value={g.fit} onChange={(e) => update(g.id, { fit: e.target.value })} placeholder="Masculino, Feminino… (vazio = única)" list="fit-presets" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={small}>Preço (€, opcional)</span>
              <input className="input" style={{ fontSize: 13 }} inputMode="decimal" value={g.price} onChange={(e) => update(g.id, { price: e.target.value })} placeholder="base" />
            </label>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setGroups((gs) => gs.filter((x) => x.id !== g.id))} disabled={groups.length === 1} aria-label="Remover versão">
              ✕
            </button>
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={small}>Tamanhos (separados por espaço ou vírgula)</span>
            <input className="input" style={{ fontSize: 13 }} value={g.sizes} onChange={(e) => update(g.id, { sizes: e.target.value })} placeholder="S M L XL" />
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SIZE_PRESETS.map((p) => (
              <button key={p.label} type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => update(g.id, { sizes: p.value })}>
                {p.label}: {p.value}
              </button>
            ))}
          </div>
        </div>
      ))}
      <datalist id="fit-presets">
        {FIT_PRESETS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {FIT_PRESETS.filter((f) => !groups.some((g) => g.fit.toLowerCase() === f.toLowerCase())).map((f) => (
          <button
            key={f}
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 12 }}
            onClick={() =>
              setGroups((gs) => {
                const empty = gs.length === 1 && !gs[0].fit && !gs[0].sizes;
                const ng = { id: nextId++, fit: f, sizes: "", price: "" };
                return empty ? [ng] : [...gs, ng];
              })
            }
          >
            + {f}
          </button>
        ))}
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={small}>Cores (opcional, aplicadas a todas as versões)</span>
        <input className="input" style={{ fontSize: 13 }} value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Preta Branca" />
      </label>

      <p style={{ margin: 0, fontSize: 13 }}>
        {combos.length === 0 ? "Indica pelo menos uma versão com tamanhos." : `${fresh} variante(s) a criar${combos.length - fresh ? ` · ${combos.length - fresh} já existem` : ""}.`}
      </p>
      {combos.length > 0 && (
        <p style={{ margin: 0, ...small, lineHeight: 1.5 }}>
          {combos.slice(0, 40).map((c) => [c.fit, c.size, c.color].filter(Boolean).join(" / ") || "Único").join(" · ")}
          {combos.length > 40 ? " …" : ""}
        </p>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }} disabled={fresh === 0}>
          Criar {fresh || ""} variante(s)
        </button>
        <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setOpen(false)}>
          Fechar
        </button>
      </div>
      {state?.error && <p style={{ color: "var(--error)", fontSize: 12, margin: 0 }}>{state.error}</p>}
      {state?.success && <p style={{ color: "var(--success)", fontSize: 12, margin: 0 }}>Variantes criadas.</p>}
    </form>
  );
}
