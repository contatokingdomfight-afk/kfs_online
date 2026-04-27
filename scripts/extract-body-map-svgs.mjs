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

const outDir = new URL("../components/physical-assessment/anatomical-illustration/", import.meta.url);
fs.mkdirSync(outDir, { recursive: true });
const front = extractSvg("illu-front");
const back = extractSvg("illu-back");
fs.writeFileSync(new URL("front.svg", outDir), front);
fs.writeFileSync(new URL("back.svg", outDir), back);
console.log("wrote front.svg", front.length, "back.svg", back.length);
