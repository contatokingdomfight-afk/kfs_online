import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lines = fs
  .readFileSync(path.join(__dirname, "../tmp-adesao-plain.txt"), "utf8")
  .split("\n")
  .filter(Boolean);

const headerRe = /^(\d+\.(?:ª|º|a)?\s*-?\s*.+|Clausula\s+\d+)/i;

const html = lines
  .map((line) => {
    const safe = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (line.startsWith("Condições Gerais")) {
      return `<h2 style="font-size:1.125rem;font-weight:600;margin:16px 0 12px;">${safe}</h2>`;
    }
    if (headerRe.test(line) && line.length < 80) {
      return `<h3 style="font-size:1rem;font-weight:600;margin:14px 0 8px;">${safe}</h3>`;
    }
    return `<p style="margin:0 0 10px;">${safe}</p>`;
  })
  .join("\n");

const out = `/** Condições Gerais de Adesão — Kingdom Fight School (EPICENTRO DE HONRA, LDA). */
export const MEMBERSHIP_AGREEMENT_VERSION = "1";

export const MEMBERSHIP_AGREEMENT_BODY_PT = \`
${html}
\`.trim();
`;

fs.writeFileSync(path.join(__dirname, "../lib/membership-agreement-content.ts"), out, "utf8");
console.log("written", out.length, "chars");
