/**
 * Luva de boxe por grau (Boxe usa luvas em vez de faixas/prajied).
 * Mesma lógica de cores das faixas: 1.ª cor = luva, 2.ª = punho; no grau de 4 cores
 * a 3.ª e 4.ª cores pintam os atacadores. Gera um SVG em string (sem dependências).
 */

import { FLUENT_GLOVE_COLOR, FLUENT_GLOVE_FLAT } from "./glove-svg-source";

/** Modalidades cujo grau se mostra como luva (Boxe e Boxing Kids; Kickboxing não). */
export function isGloveModality(code: string | null | undefined): boolean {
  if (!code) return false;
  const c = code.toUpperCase();
  return c === "BKIDS" || (c.includes("BOX") && !c.includes("KICK"));
}

const HEX = /^#[0-9a-f]{6}$/i;
const safe = (c: string | undefined, fallback: string) => (c && HEX.test(c) ? c : fallback);

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return "#" + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function hex2hsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hsl2hex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, "0");
  };
  return "#" + f(0) + f(8) + f(4);
}

const CUFF_SRC = ["#BEAEC6", "#A794AD", "#946CB6", "#D3CAD7", "#CEC1D0", "#7D7484"];

/** Remapeia uma cor do desenho original para a cor do grau, mantendo o desvio de luminosidade (sombras/brilhos). */
function remap(src: string, srcBase: string, target: string, extraL = 0, keepSat = false): string {
  const [hs, ss, ls] = hex2hsl(src);
  const [hb, , lb] = hex2hsl(srcBase);
  const [ht, st, ltRaw] = hex2hsl(target);
  let lt = ltRaw;
  if (lt > 0.9) lt = 0.84;
  if (lt < 0.12) lt = 0.16;
  const dl = (ls - lb) * (st < 0.1 ? 0.9 : 0.75);
  const sat = st < 0.1 ? 0 : Math.min(1, st * (keepSat || ss > 0.3 ? 1 : 0.35));
  return hsl2hex((ht + (hs - hb) * 0.25 + 1) % 1, sat, Math.max(0.03, Math.min(0.98, lt + dl + extraL)));
}

/** Atacadores cruzados à frente do punho (coordenadas do SVG 32×32). */
function laces(colors: string[], flat: boolean): string {
  const cuff = colors[1] ?? colors[0];
  const lc = lum(cuff);
  const laceA = colors[2] ?? (lc > 0.7 ? "#27272a" : "#fafafa");
  const laceB = colors[3] ?? laceA;
  const slit = lc > 0.85 ? "#9ca3af" : lc < 0.15 ? "#000" : shade(cuff, -70);
  const x1 = 14.75, x2 = 17.65;
  const rows = flat ? [24.2, 25.9, 27.6] : [24.1, 25.35, 26.6, 27.85];
  const step = flat ? 1.7 : 1.25;
  const w = flat ? 0.62 : 0.5;
  let s = `<rect x="15.35" y="23.6" width="1.7" height="${flat ? 5.9 : 5.6}" rx=".5" fill="${slit}" opacity="${flat ? 0.55 : 0.6}"/>`;
  rows.forEach((y, i) => {
    const col = i % 2 ? laceB : laceA;
    if (!flat)
      s += `<path d="M${x1} ${y} L${x2} ${y + step} M${x2} ${y} L${x1} ${y + step}" stroke="#000" stroke-opacity=".4" stroke-width="${w + 0.25}" stroke-linecap="round" transform="translate(.08 .14)"/>`;
    s += `<path d="M${x2} ${y} L${x1} ${y + step}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
    s += `<path d="M${x1} ${y} L${x2} ${y + step}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
    if (!flat)
      s += `<path d="M${x1 + 0.35} ${y + 0.15} L${x2 - 0.6} ${y + step - 0.35}" stroke="#fff" stroke-opacity=".35" stroke-width=".14" stroke-linecap="round"/>`;
  });
  if (!flat) {
    [...rows, rows[rows.length - 1] + step].forEach((y) => {
      s += `<circle cx="${x1}" cy="${y}" r=".3" fill="#e4e4e7" stroke="#52525b" stroke-width=".1"/><circle cx="${x2}" cy="${y}" r=".3" fill="#e4e4e7" stroke="#52525b" stroke-width=".1"/>`;
    });
    const y0 = rows[0] - 0.2;
    s += `<path d="M16.2 ${y0} C15.2 ${y0 - 0.9} 14.1 ${y0 - 0.4} 14.6 ${y0 + 0.1} C15 ${y0 + 0.45} 15.7 ${y0 + 0.2} 16.2 ${y0}" fill="none" stroke="${laceA}" stroke-width=".42" stroke-linecap="round"/>`;
    s += `<path d="M16.2 ${y0} C17.2 ${y0 - 0.9} 18.3 ${y0 - 0.4} 17.8 ${y0 + 0.1} C17.4 ${y0 + 0.45} 16.7 ${y0 + 0.2} 16.2 ${y0}" fill="none" stroke="${laceB}" stroke-width=".42" stroke-linecap="round"/>`;
    s += `<circle cx="16.2" cy="${y0}" r=".36" fill="${laceA}"/>`;
  }
  return s;
}

/** Marca KFS nas costas da mão. */
function logo(body: string): string {
  const fill = lum(body) > 0.6 ? "rgba(0,0,0,.45)" : "rgba(255,255,255,.88)";
  return `<text x="14.6" y="13.3" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="900" font-size="3.9" letter-spacing=".15" fill="${fill}">KFS</text>`;
}

function rootAttrs(body: string, size: number, title?: string): string {
  const glow = lum(body) < 0.15 ? "filter:drop-shadow(0 0 1px rgba(255,255,255,.4));" : "";
  return `width="${size}" height="${size}" style="display:block;${glow}" role="img"${title ? ` aria-label="${escapeAttr(title)}"` : ` aria-hidden="true"`}`;
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

/**
 * SVG da luva para as cores de um grau.
 * @param style "3d" (volume, ilhoses, laço) para tamanhos grandes; "flat" para ícones pequenos.
 * @param idSeed sufixo único para os ids de gradientes/filtros (obrigatório no 3D quando há várias luvas na página).
 */
export function gloveSvg(colorsIn: string[], opts: { size: number; style?: "3d" | "flat"; idSeed?: string; title?: string }): string {
  const colors = colorsIn.filter((c) => HEX.test(c));
  const body = safe(colors[0], "#9ca3af");
  const cuff = safe(colors[1], body);
  const single = !colors[1];
  const label = "#F2F2F2";
  const style = opts.style ?? (opts.size >= 40 ? "3d" : "flat");
  const palette = [body, cuff, ...colors.slice(2)];

  if (style === "flat") {
    const thumb = lum(body) > 0.85 ? "#D4D4D8" : lum(body) < 0.15 ? "#2a2a2e" : shade(body, -45);
    const cuffC = single ? shade(cuff, lum(cuff) > 0.85 ? -30 : -35) : cuff;
    return FLUENT_GLOVE_FLAT.replace(/<path d="M17\.688 25H13\.312[^>]*\/>/, "")
      .replace(/(<path d="M22 23H9V29[^>]*\/>)/, "$1" + laces(palette, true))
      .replace("</svg>", logo(body) + "</svg>")
      .replace("#CA0B4A", thumb)
      .replace("#F8312F", body)
      .replace("#9B9B9B", cuffC)
      .replace('width="32" height="32"', rootAttrs(body, opts.size, opts.title));
  }

  const seed = "_" + (opts.idSeed ?? "g").replace(/[^a-zA-Z0-9_-]/g, "");
  const mapHex = (hex: string) => {
    const H = hex.toUpperCase();
    if (CUFF_SRC.includes(H)) return remap(H, "#BEAEC6", cuff, single ? -0.07 : 0, true);
    if (hex2hsl(H)[1] > 0.45) return remap(H, "#EE3863", body);
    return remap(H, "#D8CAE2", label);
  };
  const a = FLUENT_GLOVE_COLOR.indexOf('<g filter="url(#filter0_f_18_3139)">');
  const b = FLUENT_GLOVE_COLOR.indexOf('<g filter="url(#filter2_i_18_3139)">');
  let svg = (FLUENT_GLOVE_COLOR.slice(0, a) + "<!--LACES-->" + FLUENT_GLOVE_COLOR.slice(b))
    .replace(/_18_3139/g, seed)
    .replace(/#[0-9A-Fa-f]{6}/g, mapHex)
    .replace(/values="0 0 0 0 ([\d.]+) 0 0 0 0 ([\d.]+) 0 0 0 0 ([\d.]+) 0 0 0 1 0"/g, (_m, r: string, g: string, bl: string) => {
      const src = "#" + [r, g, bl].map((v) => Math.round(Number(v) * 255).toString(16).padStart(2, "0")).join("");
      const n = parseInt(mapHex(src).slice(1), 16);
      const ch = [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((v) => v.toFixed(4));
      return `values="0 0 0 0 ${ch[0]} 0 0 0 0 ${ch[1]} 0 0 0 0 ${ch[2]} 0 0 0 1 0"`;
    });
  svg = svg.replace("<!--LACES-->", laces(palette, false)).replace("</svg>", logo(body) + "</svg>");
  return svg.replace('width="32" height="32"', rootAttrs(body, opts.size, opts.title));
}
