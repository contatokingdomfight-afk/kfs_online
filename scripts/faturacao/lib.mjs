/**
 * Código comum aos scripts do WeoInvoice (weo-clientes, weo-faturas).
 * O WeoInvoice é PHP antigo em windows-1252, sem CSRF: os scripts repetem os POSTs dos formulários
 * com o cookie de sessão (não usa a API paga).
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const BASE = "https://www.weoinvoice.com/";

/** Pessoas da casa que nunca são clientes (comparação sem acentos, todas as palavras têm de aparecer). */
const EXCLUIR_NOMES = ["Gustavo Coutinho", "Icaro Bueno", "Oseias Beu", "Kingdom Fight"];
const EXCLUIR_EMAILS = ["contatokingdomfight@gmail.com"];
const PADRAO_TESTE = /(^|[^a-z])(test|teste|testes|demo)([^a-z]|$)|@local\.test$|@teste\.com$/i;

// ---------- utilitários ----------

const semAcentos = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const one = (x) => (Array.isArray(x) ? x[0] ?? null : x ?? null);

const soDigitos = (s) => String(s ?? "").replace(/\D/g, "");

/** Validação do NIF português (dígito de controlo). */
function nifValido(nif) {
  if (!/^[0-9]{9}$/.test(nif)) return false;
  if (!"1235689".includes(nif[0]) && !["45", "70", "71", "72", "74", "75", "77", "79", "90", "91", "98", "99"].includes(nif.slice(0, 2))) {
    return false;
  }
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += Number(nif[i]) * (9 - i);
  const resto = soma % 11;
  const controlo = resto < 2 ? 0 : 11 - resto;
  return controlo === Number(nif[8]);
}

function normalizarCodigoPostal(cp) {
  const d = soDigitos(cp);
  return d.length === 7 ? `${d.slice(0, 4)}-${d.slice(4)}` : String(cp ?? "").trim();
}

/** "lara almestre" → "Lara Almestre"; partículas (de, da, dos…) ficam em minúscula. */
function capitalizarNome(nome) {
  const particulas = new Set(["de", "da", "do", "das", "dos", "e"]);
  return String(nome ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((p, i) => (i > 0 && particulas.has(p.toLowerCase()) ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
    .join(" ");
}

/** Emails gerados para alunos sem email real (não recebem correio). */
const EMAIL_SINTETICO = /@alunos\.kingdomfight\.pt$/i;

function normalizarTelemovel(tel) {
  let d = soDigitos(tel);
  if (d.startsWith("00351")) d = d.slice(5);
  else if (d.startsWith("351") && d.length === 12) d = d.slice(3);
  return d.length === 9 ? d : String(tel ?? "").trim();
}

// O WeoInvoice é windows-1252: os campos têm de ir codificados nesse charset.
const CP1252_EXTRA = new Map(
  [...new TextDecoder("windows-1252").decode(Uint8Array.from({ length: 32 }, (_, i) => 0x80 + i))].map((ch, i) => [ch, 0x80 + i]),
);
function encodeCp1252(str) {
  let out = "";
  for (const ch of String(str)) {
    let b = ch.codePointAt(0);
    if (b > 0xff || (b >= 0x80 && b < 0xa0)) b = CP1252_EXTRA.get(ch) ?? 0x3f; // "?" se não existir
    if ((b >= 0x30 && b <= 0x39) || (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a) || "-_.*".includes(ch)) out += ch;
    else if (b === 0x20) out += "+";
    else out += "%" + b.toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}
const bytesCp1252 = (str) =>
  Uint8Array.from([...String(str)].map((ch) => {
    const b = ch.codePointAt(0);
    return b > 0xff || (b >= 0x80 && b < 0xa0) ? CP1252_EXTRA.get(ch) ?? 0x3f : b;
  }));
/** Multipart com os valores em windows-1252 — é assim que o browser envia os formulários do WeoInvoice. */
function multipartCp1252(pares) {
  const fronteira = `----kfs${Date.now()}${Math.random().toString(16).slice(2)}`;
  const partes = [];
  for (const [k, v] of pares) {
    partes.push(bytesCp1252(`--${fronteira}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n`), bytesCp1252(v ?? ""), bytesCp1252("\r\n"));
  }
  partes.push(bytesCp1252(`--${fronteira}--\r\n`));
  return { body: new Blob(partes), contentType: `multipart/form-data; boundary=${fronteira}` };
}
const formBody = (pares) => pares.map(([k, v]) => `${encodeCp1252(k)}=${encodeCp1252(v ?? "")}`).join("&");

// ---------- WeoInvoice (sessão por cookie) ----------

const cookies = new Map();
function guardarCookies(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [par] = c.split(";");
    const i = par.indexOf("=");
    cookies.set(par.slice(0, i).trim(), par.slice(i + 1).trim());
  }
}
const cookieHeader = () => [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");

/**
 * `body` string = formulário urlencoded em windows-1252; FormData = multipart (como o browser envia).
 * `ajax: true` imita o $.ajax do site: corpo em UTF-8 (encodeURIComponent) e X-Requested-With.
 */
async function pedido(path, { method = "GET", body, ajax = false, referer, contentType } = {}) {
  let url = new URL(path, BASE).toString();
  let opts = { method, body };
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(url, {
      method: opts.method,
      body: opts.body,
      redirect: "manual",
      headers: {
        cookie: cookieHeader(),
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
        ...(contentType && opts.body ? { "content-type": contentType } : {}),
        ...(typeof opts.body === "string" && !ajax && !contentType ? { "content-type": "application/x-www-form-urlencoded; charset=windows-1252" } : {}),
        ...(opts.body && ajax ? { "content-type": "application/x-www-form-urlencoded", "x-requested-with": "XMLHttpRequest" } : {}),
        ...(opts.body ? { origin: BASE.slice(0, -1), referer: referer ?? BASE + "admin.php" } : {}),
      },
    });
    guardarCookies(res);
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url).toString();
      opts = { method: "GET" };
      continue;
    }
    const html = new TextDecoder("windows-1252").decode(await res.arrayBuffer());
    return { status: res.status, url, html };
  }
  throw new Error(`Demasiados redireccionamentos em ${path}`);
}

let sessaoActiva = false;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Pedido ao WeoInvoice com recuperação automática:
 *  - falha de rede num GET → repete até 3 vezes (um POST nunca é repetido às cegas: quem chama confirma o estado);
 *  - sessão expirada (volta o ecrã de login) → faz login de novo e repete o pedido, que não chegou a ser processado.
 */
async function weo(path, opts = {}) {
  const ehGet = (opts.method ?? "GET") === "GET";
  let reLogin = false;
  for (let tentativa = 1; ; tentativa++) {
    let r;
    try {
      r = await pedido(path, opts);
    } catch (e) {
      if (ehGet && tentativa < 3) {
        await esperar(1500 * tentativa);
        continue;
      }
      throw new Error(`sem ligação ao WeoInvoice (${e.cause?.code ?? e.message})`);
    }
    if (sessaoActiva && !reLogin && /func=submitlogin/.test(r.html) && !/func=updateclient|func=updateinvoice|id="total_value"/.test(r.html)) {
      reLogin = true;
      await weoLogin();
      continue;
    }
    return r;
  }
}

async function weoLogin() {
  const { WEO_EMAIL, WEO_PASSWORD } = process.env;
  if (!WEO_EMAIL || !WEO_PASSWORD) throw new Error("Faltam WEO_EMAIL e WEO_PASSWORD no .env.local");
  sessaoActiva = false;
  cookies.clear();
  await weo("admin.php"); // abre sessão (PHPSESSID)
  await weo("admin.php?type=adminform&module=user&func=submitlogin", {
    method: "POST",
    body: formBody([["email", WEO_EMAIL], ["password", WEO_PASSWORD], ["submit", "Entrar"]]),
  });
  const { html } = await weo("admin.php?module=client&func=list");
  if (!/func=updateclient|module=client&amp;func=view|Clientes\s*\(\d+\)/i.test(html)) {
    throw new Error("Login no WeoInvoice falhou (verifica WEO_EMAIL / WEO_PASSWORD).");
  }
  sessaoActiva = true;
}

const decodeHtml = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

/** Lista de clientes: colunas Código | Responsável | Empresa | Cidade | NIF | Estado | Grupo. */
async function weoListarClientes() {
  const clientes = new Map(); // id -> { nome, empresa, nif }
  for (let page = 1; page <= 50; page++) {
    const { html } = await weo(`admin.php?module=client&func=list&sort=name&order=asc&page=${page}&clientgroup=0&clientstatus=0&keyword=`);
    let novos = 0;
    for (const tr of html.match(/<tr class="row[\s\S]*?<\/tr>/g) ?? []) {
      const id = tr.match(/id="client(\d+)"/)?.[1];
      if (!id || clientes.has(id)) continue;
      const encid = tr.match(/func=view&(?:amp;)?id=([0-9a-f]{40})/)?.[1];
      const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => decodeHtml(m[1]));
      clientes.set(id, { id, encid, nome: tds[1] ?? "", empresa: tds[2] ?? "", nif: soDigitos(tds[4]) });
      novos++;
    }
    if (!novos) break;
  }
  return [...clientes.values()];
}

const decodeAttr = (v) =>
  String(v ?? "").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Campos de um formulário HTML (inputs, radios marcados, textareas, selects), pela ordem em que aparecem. */
function lerCamposForm(html) {
  const campos = [];
  for (const m of html.matchAll(/<(input|textarea|select)\b([^>]*)>([\s\S]*?<\/(?:textarea|select)>)?/gi)) {
    const [, tag, attrs, resto = ""] = m;
    const nome = attrs.match(/\bname="([^"]*)"/)?.[1];
    if (!nome) continue;
    const tipo = (attrs.match(/\btype="([^"]*)"/)?.[1] ?? "text").toLowerCase();
    if (tag.toLowerCase() === "input") {
      if (["button", "submit", "file"].includes(tipo)) continue;
      if ((tipo === "radio" || tipo === "checkbox") && !/\bchecked\b/i.test(attrs)) continue;
      campos.push([nome, decodeAttr(attrs.match(/\bvalue="([^"]*)"/)?.[1] ?? (tipo === "checkbox" ? "on" : ""))]);
    } else if (tag.toLowerCase() === "textarea") {
      campos.push([nome, decodeAttr(resto.replace(/<\/textarea>$/i, ""))]);
    } else {
      const sel = resto.match(/<option[^>]*\bselected\b[^>]*>/i)?.[0] ?? resto.match(/<option[^>]*>/i)?.[0] ?? "";
      campos.push([nome, decodeAttr(sel.match(/\bvalue="([^"]*)"/)?.[1] ?? "")]);
    }
  }
  return campos;
}

/** Ficha do cliente no WeoInvoice (formulário de edição). */
async function weoLerCliente(encid) {
  const { html } = await weo(`admin.php?module=client&func=edit&id=${encid}`);
  const form = html.match(/<form[^>]*func=updateclient[\s\S]*?<\/form>/)?.[0] ?? "";
  const campos = lerCamposForm(form);
  const valor = (n) => (campos.find(([k]) => k === n)?.[1] ?? "").trim();
  return { campos, morada: valor("address"), codigoPostal: valor("postcode"), telemovel: valor("mobile"), email: valor("email") };
}

/**
 * Actualiza campos de um cliente reenviando o formulário de edição com os valores actuais.
 * Os campos de pagamentos/recibos que a página também tem (check123, date123, payment123, pay123…) ficam de fora.
 */
async function weoActualizarCliente(encid, alteracoes) {
  const { campos } = await weoLerCliente(encid);
  if (!campos.some(([k, v]) => k === "mode" && v === "edit")) throw new Error("formulário de edição do cliente não encontrado");
  const pares = campos
    .filter(([k]) => !/^(check|date|payment|pay)\d+$/.test(k) && !["payaccounts", "receipt_serie", "receipt_date"].includes(k))
    .map(([k, v]) => [k, k in alteracoes ? alteracoes[k] : v]);
  const { body, contentType } = multipartCp1252(pares);
  await weo("admin.php?type=adminform&module=client&func=updateclient", {
    method: "POST",
    body,
    contentType,
    referer: `https://www.weoinvoice.com/admin.php?module=client&func=edit&id=${encid}`,
  });
  const depois = await weoLerCliente(encid);
  for (const [k, v] of Object.entries(alteracoes)) {
    const lido = (depois.campos.find(([c]) => c === k)?.[1] ?? "").trim();
    if (lido !== String(v).trim()) throw new Error(`o campo ${k} não ficou gravado (está «${lido}»)`);
  }
}

/**
 * Cliente do WeoInvoice que corresponde ao aluno: primeiro pelo nome exacto (sem acentos);
 * pelo NIF só quando um único cliente tem esse NIF (pais e filhos podem partilhar o NIF do encarregado).
 */
export function encontrarCliente(clientes, { nome, nif }) {
  const porNome = clientes.filter((c) => semAcentos(c.nome) === semAcentos(nome));
  if (porNome.length === 1) return porNome[0];
  const porNif = nif ? clientes.filter((c) => c.nif === nif) : [];
  return porNif.length === 1 ? porNif[0] : null;
}

export function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/** Casa, contas que não são de aluno e contas de teste. Devolve o motivo ou null. */
export function motivoExclusaoBase(a) {
  const nome = semAcentos(a.nome);
  const palavras = new Set(nome.split(" "));
  if (EXCLUIR_NOMES.some((n) => semAcentos(n).split(" ").every((p) => palavras.has(p)))) return "casa";
  if (EXCLUIR_EMAILS.includes(a.email)) return "casa";
  if (a.role && a.role !== "ALUNO") return `role ${a.role}`;
  if (PADRAO_TESTE.test(a.email) || PADRAO_TESTE.test(nome)) return "teste";
  return null;
}

export {
  semAcentos,
  one,
  soDigitos,
  nifValido,
  normalizarCodigoPostal,
  capitalizarNome,
  EMAIL_SINTETICO,
  normalizarTelemovel,
  formBody,
  weo,
  weoLogin,
  decodeHtml,
  weoListarClientes,
  weoLerCliente,
  weoActualizarCliente,
};
