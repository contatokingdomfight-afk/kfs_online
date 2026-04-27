import fs from "fs";

const htmlPath = new URL("../body-map-anatomical.html", import.meta.url);
const html = fs.readFileSync(htmlPath, "utf8");

function extractSvg(id) {
  const idx = html.indexOf(`id="${id}"`);
  if (idx < 0) throw new Error(`missing ${id}`);
  const start = html.lastIndexOf("<svg", idx);
  if (start < 0) throw new Error(`no svg start ${id}`);
  const sub = html.slice(start);
  const end = sub.indexOf("</svg>");
  if (end < 0) throw new Error(`no svg end ${id}`);
  return sub.slice(0, end + "</svg>".length);
}

/** Conteúdo entre `<svg…>` e `</svg>` para embutir num `<svg>` React (sem 2.º pedido HTTP). */
function svgInnerMarkup(fullSvg) {
  const gt = fullSvg.indexOf(">");
  if (gt < 0) throw new Error("svg: missing first >");
  const close = fullSvg.lastIndexOf("</svg>");
  if (close < 0) throw new Error("svg: missing </svg>");
  return fullSvg.slice(gt + 1, close).trim();
}

const outDir = new URL("../public/anatomical-body/", import.meta.url);
fs.mkdirSync(outDir, { recursive: true });
const front = extractSvg("illu-front");
const back = extractSvg("illu-back");
fs.writeFileSync(new URL("front.svg", outDir), front);
fs.writeFileSync(new URL("back.svg", outDir), back);
console.log("wrote public front.svg", front.length, "back.svg", back.length);

const innerFront = svgInnerMarkup(front);
const innerBack = svgInnerMarkup(back);
const genDir = new URL("../components/physical-assessment/generated/", import.meta.url);
fs.mkdirSync(genDir, { recursive: true });
const genPath = new URL("anatomical-svg-inners.ts", genDir);
const ts = `/* eslint-disable max-len -- ficheiro gerado */
/**
 * Markup interno das ilustrações (só o interior do &lt;svg&gt; original).
 * Gerado por \`scripts/extract-body-map-svgs.mjs\` — não editar à mão.
 */
export const ANATOMICAL_FRONT_SVG_INNER = ${JSON.stringify(innerFront)};
export const ANATOMICAL_BACK_SVG_INNER = ${JSON.stringify(innerBack)};
`;
fs.writeFileSync(genPath, ts, "utf8");
console.log("wrote", genPath.pathname || genPath, "chars front", innerFront.length, "back", innerBack.length);
