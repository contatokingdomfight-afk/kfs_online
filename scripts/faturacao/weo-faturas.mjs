/**
 * Emite no WeoInvoice as facturas das mensalidades pagas num mês.
 *
 * Regra: uma factura por pagamento TUITION com estado PAID e valor > 0 no mês de referência.
 * Linha: artigo = nome do plano, serviço, qtd 1, preço = preço do plano, IVA 23%,
 *        desconto ajustado para o total (IVA incluído) dar o valor pago.
 * Não marca como paga — só emite (fecha).
 *
 * Requer no .env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WEO_EMAIL, WEO_PASSWORD
 *
 * Uso:
 *   node scripts/faturacao/weo-faturas.mjs --mes=2026-10                  → ensaio: só mostra
 *   node scripts/faturacao/weo-faturas.mjs --mes=2026-10 --emitir --so=1  → emite só a 1.ª
 *   node scripts/faturacao/weo-faturas.mjs --mes=2026-10 --emitir         → emite todas
 *   --data=AAAA-MM-DD  data de emissão (por omissão: hoje)
 *   --vencimento=AAAA-MM-DD  data de vencimento (por omissão: igual à de emissão; não pode ser anterior)
 *   --tipo=fr|ft       fatura-recibo (por omissão) ou fatura
 *   --forcar           emite mesmo que o cliente já tenha factura no WeoInvoice no mês da emissão
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  capitalizarNome,
  decodeHtml,
  encontrarCliente,
  motivoExclusaoBase,
  normalizarCodigoPostal,
  one,
  semAcentos,
  soDigitos,
  supabaseAdmin,
  weo,
  weoActualizarCliente,
  weoLerCliente,
  weoListarClientes,
  weoLogin,
} from "./lib.mjs";

const args = process.argv.slice(2);
const arg = (nome) => args.find((a) => a.startsWith(`--${nome}=`))?.split("=")[1];
const EMITIR = args.includes("--emitir");
const FORCAR = args.includes("--forcar");
const SO = Number(arg("so") ?? 0) || 0;
const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Lisbon" });
const MES = arg("mes") ?? hoje.slice(0, 7);
const DATA = arg("data") ?? hoje;
const VENCIMENTO = arg("vencimento") ?? DATA;
/** Tipos de documento do WeoInvoice. A contabilidade pediu fatura-recibo (os alunos já pagaram). */
const TIPOS = { fr: { id: "11", nome: "Factura-Recibo" }, ft: { id: "1", nome: "Factura" } };
const TIPO = TIPOS[(arg("tipo") ?? "fr").toLowerCase()];
if (!TIPO) {
  console.error("Tipo inválido: --tipo=fr (fatura-recibo, por omissão) ou --tipo=ft (fatura)");
  process.exit(1);
}
if (!/^\d{4}-\d{2}$/.test(MES) || ![DATA, VENCIMENTO].every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))) {
  console.error("Formato: --mes=AAAA-MM --data=AAAA-MM-DD --vencimento=AAAA-MM-DD");
  process.exit(1);
}

const IVA = 23;
const REGISTO = join(dirname(fileURLToPath(import.meta.url)), "registo-faturas.json");
const DEBUG = join(dirname(fileURLToPath(import.meta.url)), "debug-ultima-resposta.html");

const euros = (cent) => (cent / 100).toFixed(2).replace(".", ",") + " €";
const centimos = (v) => Math.round(Number(v) * 100);

/**
 * Base tributável (cêntimos) cujo total com IVA dá exactamente o valor pago.
 * Quando não existe (ex.: 55 € → 54,99 ou 55,01), fica o mais próximo sem passar o valor pago.
 */
function baseParaTotal(totalCent) {
  const aprox = Math.round((totalCent * 100) / (100 + IVA));
  let melhor = null;
  for (let base = aprox - 3; base <= aprox + 3; base++) {
    const total = base + Math.round((base * IVA) / 100);
    const dif = total - totalCent;
    if (!melhor || Math.abs(dif) < Math.abs(melhor.dif) || (Math.abs(dif) === Math.abs(melhor.dif) && dif < melhor.dif)) {
      melhor = { base, total, dif };
    }
  }
  return melhor;
}

function calcularLinha(pagoCent, plano) {
  const { base, total, dif } = baseParaTotal(pagoCent);
  const precoPlanoCent = plano ? centimos(plano.priceMonthly) : 0;
  const precoCent = precoPlanoCent >= base ? precoPlanoCent : base;
  return {
    artigo: plano?.name ?? "Mensalidade",
    precoCent,
    descontoCent: precoCent - base,
    baseCent: base,
    totalCent: total,
    difCent: dif,
  };
}

// ---------- registo local (evita facturar o mesmo pagamento duas vezes) ----------

const lerRegisto = () => (existsSync(REGISTO) ? JSON.parse(readFileSync(REGISTO, "utf8")) : {});
function gravarRegisto(paymentId, dados) {
  const reg = lerRegisto();
  reg[paymentId] = dados;
  writeFileSync(REGISTO, JSON.stringify(reg, null, 2));
}

// ---------- Kingdom ----------

async function carregarPagamentos() {
  const sb = supabaseAdmin();
  const [{ data: pagamentos, error }, { data: planos, error: e2 }] = await Promise.all([
    sb
      .from("Payment")
      .select(
        "id, amount, referenceMonth, student:Student(id, planId, user:User!userId(name, email, role), ficha:StudentEnrollmentForm(taxId, planId, addressLine, postalCode))",
      )
      .eq("referenceMonth", MES)
      .eq("status", "PAID")
      .eq("paymentType", "TUITION")
      .gt("amount", 0),
    sb.from("Plan").select("id, name, priceMonthly"),
  ]);
  if (error) throw error;
  if (e2) throw e2;
  const planoPorId = new Map(planos.map((p) => [p.id, p]));
  return pagamentos.map((p) => {
    const s = one(p.student) ?? {};
    const user = one(s.user) ?? {};
    const ficha = one(s.ficha) ?? {};
    return {
      paymentId: p.id,
      pagoCent: centimos(p.amount),
      nome: capitalizarNome(user.name),
      email: String(user.email ?? "").toLowerCase(),
      role: user.role,
      nif: soDigitos(ficha.taxId),
      morada: String(ficha.addressLine ?? "").replace(/\s+/g, " ").trim(),
      codigoPostal: normalizarCodigoPostal(ficha.postalCode),
      plano: planoPorId.get(s.planId) ?? planoPorId.get(ficha.planId) ?? null,
    };
  });
}

// ---------- WeoInvoice ----------

/** Facturas de um cliente: número, data de emissão (AAAA-MM-DD) e se está anulada. */
async function weoFacturasDoCliente(clienteId) {
  const vistas = new Map();
  for (let page = 1; page <= 20; page++) {
    const { html } = await weo(`admin.php?module=invoice&func=list&page=${page}&invoicetype=0&clientid=${clienteId}&keyword=`);
    let novas = 0;
    for (const tr of html.match(/<tr class="row[\s\S]*?<\/tr>/g) ?? []) {
      const encid = tr.match(/func=invoice&(?:amp;)?id=([0-9a-f]{40})/)?.[1];
      if (!encid || vistas.has(encid)) continue;
      const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => decodeHtml(m[1]));
      vistas.set(encid, { encid, tipo: tds[0], numero: tds[1], cliente: tds[2], valor: tds[3], data: tds[4], anulada: /anulad/i.test(tds[6] ?? ""), aberta: /aberto/i.test(tds[6] ?? "") });
      novas++;
    }
    if (!novas) break;
  }
  return [...vistas.values()];
}

const campoHidden = (html, id) => html.match(new RegExp(`<input[^>]*id="${id}"[^>]*value="([^"]*)"`))?.[1] ?? html.match(new RegExp(`<input[^>]*value="([^"]*)"[^>]*id="${id}"`))?.[1];
const totalDaPagina = (html) => {
  const t = html.match(/id="total_value"[^>]*>\s*([\d.,]+)/)?.[1];
  return t == null ? null : centimos(t.replace(/\./g, "").replace(",", "."));
};
/** "fechado" | "anulado" | "aberto" — vem em <span class="invoice-status">…</span> (as maiúsculas no ecrã são só CSS). */
const estadoDaPagina = (html) => {
  const s = semAcentos(html.match(/class="invoice-status">\s*([^<]+)/)?.[1] ?? "");
  return /fechad/.test(s) ? "fechado" : /anulad/.test(s) ? "anulado" : s ? "aberto" : null;
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Erro que não se resolve a repetir: o script passa ao aluno seguinte. */
class Falha extends Error {}

async function lerFactura(encid) {
  const link = `https://www.weoinvoice.com/admin.php?module=invoice&func=invoice&id=${encid}`;
  const { html } = await weo(link);
  return {
    link,
    html,
    id: campoHidden(html, "id"),
    clientid: campoHidden(html, "clientid"),
    estado: estadoDaPagina(html),
    total: totalDaPagina(html),
    numero: decodeHtml(html).match(/Factura(?:-Recibo)?\s+n\S*\s*(\d{4}\/\d+)/)?.[1],
  };
}

/** Apaga uma factura — só se estiver ABERTA (as fechadas não se apagam; anulam-se). */
async function apagarRascunho(encid) {
  const f = await lerFactura(encid);
  if (f.estado !== "aberto") return false;
  await weo("admin.php?module=invoice&type=adminform&func=ajax_deletedata", { method: "POST", ajax: true, body: `id=${f.id}`, referer: f.link });
  const depois = await weo(f.link);
  return estadoDaPagina(depois.html) === null || !campoHidden(depois.html, "id");
}

/**
 * Facturas abertas (rascunhos, ainda sem valor fiscal) deste cliente no ano da emissão — restos de uma tentativa
 * anterior que não chegou a fechar (ex.: vencimento recusado). As fechadas e anuladas nunca entram aqui.
 */
async function rascunhosDoCliente(clienteId) {
  const abertas = [];
  for (const f of await weoFacturasDoCliente(clienteId)) {
    if (f.anulada || !f.data?.startsWith(DATA.slice(0, 4))) continue;
    const det = await lerFactura(f.encid);
    if (det.estado === "aberto" && det.clientid === clienteId) abertas.push(det);
  }
  return abertas;
}

async function criarCabecalho(f) {
  // Igual ao que o browser envia: abre o formulário e submete-o em multipart com os mesmos campos
  // (os do agendamento vão com os valores por omissão e são ignorados).
  const formNova = "admin.php?module=invoice&func=new";
  await weo(formNova);
  const campos = new FormData();
  for (const [k, v] of [
    ["document_type", TIPO.id],
    ["serie", DATA.slice(0, 4)],
    ["client", f.clienteId],
    ["date", DATA],
    ["payment_date", VENCIMENTO],
    ["schedule_description", ""],
    ["schedule_start", DATA],
    ["schedule_end", DATA],
    ["schedule_frequency_num", "1"],
    ["schedule_frequency_cycle", "1"],
    ["schedule_payment", "0"],
    ["mode", "new"],
    ["id", ""],
    ["message", "add"],
  ]) {
    campos.append(k, v);
  }
  const cab = await weo("admin.php?type=adminform&module=invoice&func=updateinvoice", {
    method: "POST",
    body: campos,
    referer: new URL(formNova, "https://www.weoinvoice.com/").toString(),
  });
  let encid = campoHidden(cab.html, "id") ? campoHidden(cab.html, "encid") ?? cab.url.match(/id=([0-9a-f]{40})/)?.[1] : null;
  // Alguns servidores respondem com um redireccionamento em JavaScript em vez de HTTP 302.
  const jsRedir = cab.html.match(/location(?:\.href)?\s*=\s*['"]([^'"]*func=invoice[^'"]*id=([0-9a-f]{40})[^'"]*)['"]/);
  if (!encid && jsRedir) encid = jsRedir[2];
  if (encid) return encid;

  writeFileSync(DEBUG, cab.html);
  const msg =
    cab.html.match(/var html = "([^"]+)"/)?.[1] ??
    decodeHtml(cab.html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "")).slice(0, 200);
  const e = new Falha(`o WeoInvoice recusou criar a factura: «${msg}»`);
  e.dadosCliente = /contribuinte|morada|c[óo]digo postal/i.test(msg);
  return Promise.reject(e);
}

async function adicionarLinha(f, factura) {
  const item = f.linha.artigo.replace(/€/g, "&euro;").replace(/–/g, "&#8211;");
  await weo("admin.php?module=invoice&type=adminform&func=ajax_updateproduct", {
    method: "POST",
    ajax: true,
    referer: factura.link,
    body: [
      `id=${factura.id}`,
      `item=${encodeURIComponent(item)}`,
      "producttype=S",
      "quantity=1",
      `price=${(f.linha.precoCent / 100).toFixed(2)}`,
      `discount=${(f.linha.descontoCent / 100).toFixed(2)}`,
      `tax=${IVA}`,
      `oss=${campoHidden(factura.html, "oss") ?? "0"}`,
    ].join("&"),
  });
}

/**
 * Emite uma factura e resolve sozinho o que é seguro resolver:
 *  - cliente sem morada/código postal no WeoInvoice → completa com os dados da plataforma e tenta de novo;
 *  - rascunho deixado por uma tentativa anterior → reaproveita-o (se estiver vazio) ou apaga-o;
 *  - linha que não ficou gravada ou total errado → apaga o rascunho e tenta de novo (1 vez);
 *  - fecho que não pegou → confirma de novo e repete o fecho (1 vez).
 * Nunca mexe em facturas fechadas. O que não resolver é lançado como Falha e o script segue para o próximo.
 */
async function weoEmitirFactura(f, log) {
  // 0) Restos de uma tentativa anterior para este cliente (hoje, ainda abertos)
  for (const r of await rascunhosDoCliente(f.clienteId)) {
    if (await apagarRascunho(r.encid)) log(`apaguei um rascunho aberto que tinha ficado de uma tentativa anterior`);
  }

  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    // 1) Cabeçalho
    let encid;
    try {
      encid = await criarCabecalho(f);
    } catch (e) {
      if (e instanceof Falha && e.dadosCliente && tentativa === 1 && (f.morada || f.codigoPostal)) {
        const alteracoes = {};
        if (f.morada) alteracoes.address = f.morada;
        if (f.codigoPostal) alteracoes.postcode = f.codigoPostal;
        await weoActualizarCliente(f.clienteEncid, alteracoes);
        log(`completei a morada/código postal do cliente com os dados da plataforma`);
        continue;
      }
      throw e;
    }
    let factura = await lerFactura(encid);
    if (factura.clientid && factura.clientid !== f.clienteId) {
      if (factura.estado === "aberto") await apagarRascunho(encid);
      throw new Falha(`a factura criada ficou associada a outro cliente (${factura.clientid}) — apaguei o rascunho`);
    }
    if (factura.estado === "fechado") return { numero: factura.numero, link: factura.link };

    // 2) Linha + confirmação do total antes de fechar
    await adicionarLinha(f, factura);
    factura = await lerFactura(encid);
    if (factura.total !== f.linha.totalCent) {
      const apagado = await apagarRascunho(encid);
      const msg = `total no WeoInvoice ${factura.total == null ? "?" : euros(factura.total)} ≠ esperado ${euros(f.linha.totalCent)}`;
      if (tentativa === 1 && apagado) {
        log(`${msg} — apaguei o rascunho e vou tentar de novo`);
        await esperar(1500);
        continue;
      }
      throw new Falha(`${msg}${apagado ? " (rascunho apagado)" : ` — ficou ABERTA: ${factura.link}`}`);
    }

    // 3) Fechar (emitir) e confirmar; se não pegou, repete o fecho uma vez
    for (let fecho = 1; fecho <= 2; fecho++) {
      await weo("admin.php?module=invoice&type=adminform&func=ajax_updatedata", {
        method: "POST",
        ajax: true,
        referer: factura.link,
        body: `id=${factura.id}&closed=1`,
      });
      for (let leitura = 0; leitura < 3; leitura++) {
        factura = await lerFactura(encid);
        if (factura.estado === "fechado") return { numero: factura.numero, link: factura.link };
        await esperar(1000);
      }
      if (fecho === 1) log(`o fecho não pegou à primeira — vou repetir`);
    }
    throw new Falha(`não consegui fechar a factura (está «${factura.estado ?? "?"}»): ${factura.link}`);
  }
  throw new Falha("o WeoInvoice continuou a recusar depois de completar o cliente");
}

// ---------- principal ----------

async function main() {
  console.log(`${EMITIR ? "MODO: EMITIR (vai criar facturas reais)" : "MODO: ENSAIO (não grava nada — usa --emitir para emitir)"}`);
  console.log(`Documento: ${TIPO.nome} · mês de referência: ${MES} · data de emissão: ${DATA} · vencimento: ${VENCIMENTO}\n`);
  if (VENCIMENTO < DATA) {
    // O WeoInvoice cria a factura mas recusa fechá-la (sem mensagem) quando o vencimento é anterior à emissão.
    console.error(`O vencimento (${VENCIMENTO}) não pode ser anterior à data de emissão (${DATA}) — o WeoInvoice não deixa emitir assim.`);
    process.exit(1);
  }

  const pagamentos = await carregarPagamentos();
  await weoLogin();
  // Sem o código de validação da AT para este tipo de documento na série, o WeoInvoice não o deixa emitir.
  const serie = await weo(`admin.php?module=user&func=series&original=${DATA.slice(0, 4)}`);
  const codigo = serie.html.match(new RegExp(`name="type${TIPO.id}"[^>]*value="([^"]*)"`))?.[1] ?? serie.html.match(new RegExp(`value="([^"]*)"[^>]*name="type${TIPO.id}"`))?.[1];
  if (!codigo) {
    console.error(
      `A série ${DATA.slice(0, 4)} não tem código de validação da AT para «${TIPO.nome}».\n` +
        "Pede o código à contabilidade (e-fatura → Séries) e mete-o no WeoInvoice: Configuração → Séries → " +
        `${DATA.slice(0, 4)} → ${TIPO.nome}. Depois corre de novo.`,
    );
    process.exit(1);
  }
  const clientes = await weoListarClientes();
  const registo = lerRegisto();

  const excluidos = [];
  const semCliente = [];
  const clienteIncompleto = [];
  const jaFacturados = [];
  const aEmitir = [];

  for (const p of pagamentos.sort((a, b) => a.nome.localeCompare(b.nome, "pt"))) {
    const motivo = motivoExclusaoBase(p);
    if (motivo) {
      excluidos.push({ ...p, motivo });
      continue;
    }
    if (registo[p.paymentId]) {
      jaFacturados.push({ ...p, motivo: `já emitida por este script: ${registo[p.paymentId].numero}` });
      continue;
    }
    const cliente = encontrarCliente(clientes, p);
    if (!cliente) {
      semCliente.push(p);
      continue;
    }
    // O WeoInvoice recusa facturar clientes sem NIF, morada e código postal.
    // O que a plataforma tiver, o script completa sozinho antes de emitir; o resto fica de fora.
    const ficha = await weoLerCliente(cliente.encid);
    const completar = {};
    if (!ficha.morada && p.morada) completar.address = p.morada;
    if (!ficha.codigoPostal && p.codigoPostal) completar.postcode = p.codigoPostal;
    const faltaWeo = [
      !cliente.nif && "NIF",
      !ficha.morada && !p.morada && "morada",
      !ficha.codigoPostal && !p.codigoPostal && "código postal",
    ].filter(Boolean);
    if (faltaWeo.length) {
      clienteIncompleto.push({ ...p, clienteNome: cliente.nome, faltaWeo });
      continue;
    }
    if (!FORCAR) {
      // Só as facturas feitas à mão contam aqui: as deste script já estão no registo, com o mês de referência certo.
      const doScript = new Set(Object.values(registo).map((r) => r.numero));
      const doMes = (await weoFacturasDoCliente(cliente.id)).filter(
        (f) => !f.anulada && !f.aberta && !doScript.has(f.numero) && f.data?.slice(0, 7) === DATA.slice(0, 7),
      );
      if (doMes.length) {
        jaFacturados.push({ ...p, motivo: `já tem no WeoInvoice: ${doMes.map((f) => `${f.numero} (${f.data}, ${f.valor})`).join(", ")}` });
        continue;
      }
    }
    aEmitir.push({
      ...p,
      clienteId: cliente.id,
      clienteEncid: cliente.encid,
      clienteNome: cliente.nome,
      completar,
      linha: calcularLinha(p.pagoCent, p.plano),
    });
  }

  console.log(`Excluídos (${excluidos.length}):`);
  for (const p of excluidos) console.log(`  - ${p.nome} — ${p.motivo}`);
  console.log(`\nSem cliente no WeoInvoice — corre primeiro npm run weo:clientes (${semCliente.length}):`);
  for (const p of semCliente) console.log(`  - ${p.nome} (pagou ${euros(p.pagoCent)})${p.nif ? "" : " — sem NIF na plataforma"}`);
  console.log(`\nCliente incompleto no WeoInvoice e sem esses dados na plataforma — completa à mão (${clienteIncompleto.length}):`);
  for (const p of clienteIncompleto) console.log(`  - ${p.clienteNome} — falta ${p.faltaWeo.join(", ")}`);
  console.log(`\nJá facturados — ignorados (${jaFacturados.length}):`);
  for (const p of jaFacturados) console.log(`  - ${p.nome} — ${p.motivo}`);
  console.log(`\nA emitir (${aEmitir.length}):`);
  let soma = 0;
  for (const f of aEmitir) {
    const l = f.linha;
    soma += l.totalCent;
    const nota = l.difCent ? `  (pagou ${euros(f.pagoCent)}; ${euros(l.totalCent)} é o mais próximo possível com IVA)` : "";
    const semPlano = f.plano ? "" : "  [sem plano na plataforma]";
    const completa = Object.keys(f.completar).length ? "  [vai completar morada/código postal do cliente]" : "";
    console.log(`  + ${f.clienteNome.padEnd(28)} ${l.artigo.padEnd(18)} preço ${euros(l.precoCent).padStart(9)} desc. ${euros(l.descontoCent).padStart(8)} → total ${euros(l.totalCent).padStart(9)}${nota}${semPlano}${completa}`);
  }
  console.log(`  Total a facturar: ${euros(soma)}`);

  if (!EMITIR) {
    console.log("\nEnsaio terminado. Nada foi emitido.");
    return;
  }

  const lote = SO ? aEmitir.slice(0, SO) : aEmitir;
  console.log(`\nA emitir ${lote.length} factura(s)...`);
  const emitidas = [];
  const falhadas = [];
  let seguidas = 0;
  for (const f of lote) {
    const log = (msg) => console.log(`       … ${f.clienteNome}: ${msg}`);
    try {
      if (Object.keys(f.completar).length) {
        await weoActualizarCliente(f.clienteEncid, f.completar);
        log("completei a morada/código postal do cliente com os dados da plataforma");
      }
      const { numero, link } = await weoEmitirFactura(f, log);
      gravarRegisto(f.paymentId, { numero, mes: MES, data: DATA, aluno: f.clienteNome, total: f.linha.totalCent / 100, link });
      emitidas.push({ ...f, numero });
      seguidas = 0;
      console.log(`  OK   ${numero ?? "?"}  ${f.clienteNome}  ${euros(f.linha.totalCent)}`);
    } catch (e) {
      falhadas.push({ ...f, erro: e.message });
      seguidas++;
      console.log(`  ERRO ${f.clienteNome}: ${e.message} — sigo para o próximo`);
      // Várias falhas seguidas indicam um problema geral (WeoInvoice em baixo, sessão, mudança no site): aí paro.
      if (seguidas >= 3) {
        console.log("\n3 falhas seguidas — parei para não insistir num problema geral.");
        break;
      }
    }
  }

  const naoTentadas = lote.length - emitidas.length - falhadas.length;
  const somaEmitida = euros(emitidas.reduce((s, f) => s + f.linha.totalCent, 0));
  console.log(`\nResumo: ${emitidas.length} emitida(s) (${somaEmitida}), ${falhadas.length} com erro${naoTentadas ? `, ${naoTentadas} por tentar` : ""}.`);
  if (falhadas.length) {
    console.log("Com erro — corre o mesmo comando de novo depois de resolver (as emitidas não se repetem):");
    for (const f of falhadas) console.log(`  - ${f.clienteNome}: ${f.erro}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("\nErro:", e.message ?? e);
  process.exit(1);
});
