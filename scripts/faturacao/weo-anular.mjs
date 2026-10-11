/**
 * Anula no WeoInvoice as facturas emitidas num mês (pela data de emissão).
 * ATENÇÃO: anular é irreversível — o número fica gasto e a factura fica "Anulado".
 *
 * Uso:
 *   node scripts/faturacao/weo-anular.mjs --mes=2026-10                       → ensaio: só lista
 *   node scripts/faturacao/weo-anular.mjs --mes=2026-10 --numeros=2026/28,2026/29   → só estas
 *   node scripts/faturacao/weo-anular.mjs --mes=2026-10 --anular --motivo="Erro na emissão"
 *     → pede para escreveres o mês para confirmar e anula
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { decodeHtml, weo, weoLogin } from "./lib.mjs";

const args = process.argv.slice(2);
const arg = (nome) => args.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3);
const MES = arg("mes");
const ANULAR = args.includes("--anular");
const MOTIVO = (arg("motivo") ?? "").trim();
const NUMEROS = arg("numeros")?.split(",").map((n) => n.trim()).filter(Boolean);
const REGISTO = join(dirname(fileURLToPath(import.meta.url)), "registo-faturas.json");

if (!/^\d{4}-\d{2}$/.test(MES ?? "")) {
  console.error("Indica o mês: --mes=AAAA-MM");
  process.exit(1);
}
if (ANULAR && MOTIVO.length < 5) {
  console.error('Para anular é obrigatório um motivo: --motivo="Erro na emissão"');
  process.exit(1);
}

/** Todas as facturas da lista (todas as páginas). */
async function listarFacturas() {
  const vistas = new Map();
  for (let page = 1; page <= 100; page++) {
    const { html } = await weo(`admin.php?module=invoice&func=list&sort=invoiceid&order=desc&page=${page}&invoicetype=0&clientid=0&keyword=`);
    let novas = 0;
    for (const tr of html.match(/<tr class="row[\s\S]*?<\/tr>/g) ?? []) {
      const encid = tr.match(/func=invoice&(?:amp;)?id=([0-9a-f]{40})/)?.[1];
      if (!encid || vistas.has(encid)) continue;
      const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => decodeHtml(m[1]));
      vistas.set(encid, { encid, tipo: tds[0], numero: tds[1], cliente: tds[2], valor: tds[3], data: tds[4], estado: tds[6] });
      novas++;
    }
    if (!novas) break;
  }
  return [...vistas.values()];
}

async function anular(f) {
  const link = `admin.php?module=invoice&func=invoice&id=${f.encid}`;
  const { html } = await weo(link);
  const id = html.match(/<input[^>]*id="id"[^>]*value="(\d+)"/)?.[1];
  if (!id) throw new Error("não encontrei o id interno da factura");
  await weo("admin.php?module=invoice&type=adminform&func=ajax_updatedata", {
    method: "POST",
    ajax: true,
    body: `id=${id}&cancelled=1&cancelreason=${encodeURIComponent(MOTIVO)}`,
    referer: `https://www.weoinvoice.com/${link}`,
  });
  const depois = (await weo(link)).html;
  if (!/class="invoice-status">\s*Anulad/i.test(depois)) throw new Error(`não ficou anulada — vê à mão: https://www.weoinvoice.com/${link}`);
}

/** Tira do registo do weo-faturas as facturas anuladas, para se poderem voltar a emitir. */
function limparRegisto(numeros) {
  if (!existsSync(REGISTO)) return;
  const reg = JSON.parse(readFileSync(REGISTO, "utf8"));
  for (const [paymentId, dados] of Object.entries(reg)) if (numeros.includes(dados.numero)) delete reg[paymentId];
  writeFileSync(REGISTO, JSON.stringify(reg, null, 2));
}

async function main() {
  console.log(ANULAR ? "MODO: ANULAR (irreversível)\n" : "MODO: ENSAIO (não anula nada — usa --anular --motivo=\"...\")\n");
  await weoLogin();
  const todas = (await listarFacturas()).filter((f) => f.data?.startsWith(MES) && (!NUMEROS || NUMEROS.includes(f.numero)));
  const jaAnuladas = todas.filter((f) => /anulad/i.test(f.estado));
  const abertas = todas.filter((f) => !/anulad|fechad/i.test(f.estado));
  const alvo = todas.filter((f) => /fechad/i.test(f.estado));

  console.log(`Emitidas em ${MES}${NUMEROS ? ` (só ${NUMEROS.join(", ")})` : ""}: ${todas.length}`);
  if (jaAnuladas.length) console.log(`  já anuladas, ignoradas: ${jaAnuladas.map((f) => f.numero).join(", ")}`);
  if (abertas.length) console.log(`  abertas (não emitidas), ignoradas — apaga-as à mão: ${abertas.map((f) => `${f.numero || "s/ número"} ${f.cliente}`).join(", ")}`);
  console.log(`\nA anular (${alvo.length}):`);
  for (const f of alvo) console.log(`  x ${f.tipo} ${f.numero.padEnd(9)} ${f.data}  ${f.cliente.padEnd(28)} ${f.valor}`);

  if (NUMEROS) {
    const naoEncontradas = NUMEROS.filter((n) => !todas.some((f) => f.numero === n));
    if (naoEncontradas.length) console.log(`\nAviso: não encontrei em ${MES}: ${naoEncontradas.join(", ")}`);
  }
  if (!ANULAR || !alvo.length) {
    console.log(ANULAR ? "\nNada para anular." : "\nEnsaio terminado. Nada foi anulado.");
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const resp = await rl.question(`\nVais anular ${alvo.length} factura(s) com o motivo «${MOTIVO}». Isto não se desfaz.\nEscreve ${MES} para confirmar: `);
  rl.close();
  if (resp.trim() !== MES) {
    console.log("Não confirmado. Nada foi anulado.");
    return;
  }

  const feitas = [];
  for (const f of alvo) {
    try {
      await anular(f);
      feitas.push(f.numero);
      console.log(`  ANULADA ${f.numero}  ${f.cliente}`);
    } catch (e) {
      console.log(`  ERRO ${f.numero} ${f.cliente}: ${e.message}`);
      console.log("Parei.");
      break;
    }
  }
  limparRegisto(feitas);
  console.log(`\n${feitas.length} factura(s) anulada(s).`);
}

main().catch((e) => {
  console.error("\nErro:", e.message ?? e);
  process.exit(1);
});
