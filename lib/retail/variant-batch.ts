/** Geração em lote de variantes (versão × tamanho × cor). Puro: usado no cliente (pré-visualização) e no servidor. */

export type BatchGroup = { fit: string; sizes: string[]; price: number | null };
export type BatchInput = { groups: BatchGroup[]; colors: string[] };
export type BatchCombo = { fit: string | null; size: string | null; color: string | null; price: number | null };

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export function comboKey(c: { fit?: string | null; size?: string | null; color?: string | null }): string {
  return `${norm(c.fit)}|${norm(c.size)}|${norm(c.color)}`;
}

/** Divide «S, M L;XL» em ["S","M","L","XL"] (sem repetidos). */
export function splitList(text: string): string[] {
  return [...new Set(text.split(/[,;\n\s]+/).map((s) => s.trim()).filter(Boolean))];
}

export function buildCombos(input: BatchInput): BatchCombo[] {
  const colors = input.colors.length ? input.colors : [null];
  const out: BatchCombo[] = [];
  const seen = new Set<string>();
  for (const g of input.groups) {
    const fit = g.fit.trim() || null;
    const sizes = g.sizes.length ? g.sizes : [null];
    for (const size of sizes) {
      for (const color of colors) {
        const c = { fit, size, color, price: g.price };
        const k = comboKey(c);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(c);
      }
    }
  }
  return out;
}

function slug(s: string, max: number): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase()
    .slice(0, max);
}

/** SKU legível: RASH-FEM-M-PRETA. */
export function makeSku(productSku: string, c: { fit: string | null; size: string | null; color: string | null }): string {
  return [productSku, c.fit ? slug(c.fit, 3) : "", c.size ? slug(c.size, 5) : "", c.color ? slug(c.color, 5) : ""]
    .filter(Boolean)
    .join("-");
}
