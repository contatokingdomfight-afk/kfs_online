/**
 * Utilitários de caminhos SVG para o mapa corporal: converte `d` em segmentos absolutos
 * (M/L/C/Z) para podermos deformar cada ponto (medidas do aluno) e voltar a escrever o `d`.
 */

export type Seg = { c: "M" | "L" | "C" | "Z"; p: number[] };

function arcToCubics(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  phiDeg: number,
  fa: number,
  fs: number,
  x2: number,
  y2: number
): number[][] {
  if (!rxIn || !ryIn) return [[x1, y1, x2, y2, x2, y2]];
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  const phi = (phiDeg * Math.PI) / 180;
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cp * dx + sp * dy;
  const y1p = -sp * dx + cp * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) {
    const s = Math.sqrt(lam);
    rx *= s;
    ry *= s;
  }
  const nu = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const de = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let co = Math.sqrt(Math.max(0, nu / (de || 1)));
  if (fa === fs) co = -co;
  const cxp = (co * rx * y1p) / ry;
  const cyp = (-co * ry * x1p) / rx;
  const ccx = cp * cxp - sp * cyp + (x1 + x2) / 2;
  const ccy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const th1 = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;
  let dth = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  if (!fs && dth > 0) dth -= 2 * Math.PI;
  else if (fs && dth < 0) dth += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2) - 1e-9));
  const dd = dth / n;
  const t = (4 / 3) * Math.tan(dd / 4);
  const tr = (u: number, v: number): [number, number] => [cp * rx * u - sp * ry * v + ccx, sp * rx * u + cp * ry * v + ccy];
  const out: number[][] = [];
  let a1 = th1;
  for (let k = 0; k < n; k++) {
    const a2 = a1 + dd;
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const c2 = Math.cos(a2);
    const s2 = Math.sin(a2);
    out.push([...tr(c1 - t * s1, s1 + t * c1), ...tr(c2 + t * s2, s2 - t * c2), ...tr(c2, s2)]);
    a1 = a2;
  }
  return out;
}

const NUM_RE = /^[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/;

/** Lê um atributo `d` e devolve segmentos absolutos M/L/C/Z (arcos convertidos em curvas de Bézier). */
export function parsePathD(d: string): Seg[] {
  let i = 0;
  const n = d.length;
  const out: Seg[] = [];
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let lc: [number, number] | null = null;
  let lq: [number, number] | null = null;
  let cmd = "";
  const ws = () => {
    while (i < n && (d[i] === " " || d[i] === "," || d[i] === "\n" || d[i] === "\t")) i++;
  };
  const num = () => {
    ws();
    const m = NUM_RE.exec(d.slice(i, i + 40));
    if (!m) return NaN;
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const flag = () => {
    ws();
    return d[i++] === "1" ? 1 : 0;
  };
  const more = () => {
    ws();
    return i < n && !/[a-zA-Z]/.test(d[i]);
  };
  for (;;) {
    ws();
    if (i >= n) break;
    if (/[a-zA-Z]/.test(d[i])) cmd = d[i++];
    else if (!cmd) break;
    const rel = cmd === cmd.toLowerCase();
    const K = cmd.toUpperCase();
    if (K === "Z") {
      out.push({ c: "Z", p: [] });
      cx = sx;
      cy = sy;
      lc = lq = null;
      continue;
    }
    do {
      let x: number;
      let y: number;
      if (K === "M") {
        x = num();
        y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        out.push({ c: "M", p: [x, y] });
        cx = sx = x;
        cy = sy = y;
        cmd = rel ? "l" : "L";
        lc = lq = null;
      } else if (K === "L") {
        x = num();
        y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        out.push({ c: "L", p: [x, y] });
        cx = x;
        cy = y;
        lc = lq = null;
      } else if (K === "H") {
        x = num();
        if (rel) x += cx;
        out.push({ c: "L", p: [x, cy] });
        cx = x;
        lc = lq = null;
      } else if (K === "V") {
        y = num();
        if (rel) y += cy;
        out.push({ c: "L", p: [cx, y] });
        cy = y;
        lc = lq = null;
      } else if (K === "C") {
        let a = num();
        let b = num();
        let c = num();
        let e = num();
        x = num();
        y = num();
        if (rel) {
          a += cx;
          b += cy;
          c += cx;
          e += cy;
          x += cx;
          y += cy;
        }
        out.push({ c: "C", p: [a, b, c, e, x, y] });
        lc = [c, e];
        cx = x;
        cy = y;
        lq = null;
      } else if (K === "S") {
        let c = num();
        let e = num();
        x = num();
        y = num();
        if (rel) {
          c += cx;
          e += cy;
          x += cx;
          y += cy;
        }
        const a = lc ? 2 * cx - lc[0] : cx;
        const b = lc ? 2 * cy - lc[1] : cy;
        out.push({ c: "C", p: [a, b, c, e, x, y] });
        lc = [c, e];
        cx = x;
        cy = y;
        lq = null;
      } else if (K === "Q" || K === "T") {
        let qx: number;
        let qy: number;
        if (K === "Q") {
          qx = num();
          qy = num();
          if (rel) {
            qx += cx;
            qy += cy;
          }
        } else {
          qx = lq ? 2 * cx - lq[0] : cx;
          qy = lq ? 2 * cy - lq[1] : cy;
        }
        x = num();
        y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        out.push({ c: "C", p: [cx + (2 / 3) * (qx - cx), cy + (2 / 3) * (qy - cy), x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x, y] });
        lq = [qx, qy];
        cx = x;
        cy = y;
        lc = null;
      } else if (K === "A") {
        const rx = num();
        const ry = num();
        const ph = num();
        const fa = flag();
        const fs = flag();
        x = num();
        y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        for (const c of arcToCubics(cx, cy, rx, ry, ph, fa, fs, x, y)) out.push({ c: "C", p: c });
        cx = x;
        cy = y;
        lc = lq = null;
      } else {
        i++;
        break;
      }
    } while (more());
  }
  return out;
}

const f2 = (v: number) => v.toFixed(2);

/** Escreve segmentos (já transformados) de volta para um `d`. */
export function segsToD(segs: Seg[]): string {
  let d = "";
  for (const s of segs) {
    if (s.c === "Z") {
      d += "Z";
      continue;
    }
    d += s.c;
    for (let k = 0; k < s.p.length; k += 2) d += `${f2(s.p[k])} ${f2(s.p[k + 1])} `;
  }
  return d;
}

/** Curva fechada suave (Catmull-Rom → Bézier) por uma lista de pontos. */
export function smoothClosedPath(p: ReadonlyArray<readonly [number, number]>): string {
  const n = p.length;
  let d = `M${f2(p[0][0])} ${f2(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n];
    const p1 = p[i];
    const p2 = p[(i + 1) % n];
    const p3 = p[(i + 2) % n];
    d += ` C${f2(p1[0] + (p2[0] - p0[0]) / 6)} ${f2(p1[1] + (p2[1] - p0[1]) / 6)} ${f2(p2[0] - (p3[0] - p1[0]) / 6)} ${f2(p2[1] - (p3[1] - p1[1]) / 6)} ${f2(p2[0])} ${f2(p2[1])}`;
  }
  return `${d}Z`;
}
