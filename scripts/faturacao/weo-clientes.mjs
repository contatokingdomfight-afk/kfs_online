/**
 * Cria no WeoInvoice os alunos da Kingdom que ainda não existem como clientes.
 *
 * Fonte: Supabase (User + StudentEnrollmentForm + StudentProfile).
 * Destino: weoinvoice.com — repete o POST do formulário "Novo cliente" (não usa a API paga).
 *
 * Requer no .env / .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   WEO_EMAIL, WEO_PASSWORD   (login do WeoInvoice)
 *
 * Uso:
 *   node scripts/faturacao/weo-clientes.mjs                 → ensaio: só mostra o que faria
 *   node scripts/faturacao/weo-clientes.mjs --criar --so=1  → cria apenas o 1.º da lista
 *   node scripts/faturacao/weo-clientes.mjs --criar         → cria todos os que faltam
 *   --incluir-experimentais  inclui alunos em aula experimental (por omissão: só ATIVO/INADIMPLENTE)
 */
import {
  capitalizarNome,
  EMAIL_SINTETICO,
  encontrarCliente,
  formBody,
  motivoExclusaoBase,
  nifValido,
  normalizarCodigoPostal,
  normalizarTelemovel,
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
const CRIAR = args.includes("--criar");
const INCLUIR_EXPERIMENTAIS = args.includes("--incluir-experimentais");
const SO = Number(args.find((a) => a.startsWith("--so="))?.split("=")[1] ?? 0) || 0;

/** RGPD — base legal no WeoInvoice: 1 = Execução de Contrato. */
const WEO_LAWFUL = "1";
/** Estado do cliente no WeoInvoice: 6 = Aberto. */
const WEO_STATUS_ABERTO = "6";

async function weoCriarCliente(a) {
  const { status, html } = await weo("admin.php?type=adminform&module=client&func=updateclient", {
    method: "POST",
    body: formBody([
      ["lawful", WEO_LAWFUL],
      ["code", ""],
      ["nif", a.nif],
      ["name", a.nome],
      ["entity", ""],
      ["email", a.email],
      ["url", ""],
      ["status", WEO_STATUS_ABERTO],
      ["clientgroup", ""],
      ["newgroup", ""],
      ["description", ""],
      ["address", a.morada],
      ["postcode", a.codigoPostal],
      ["city", ""],
      ["country", "PT"],
      ["telephone", ""],
      ["mobile", a.telemovel],
      ["id", ""],
      ["mode", "new"],
      ["message", "add"],
    ]),
  });
  if (status >= 400) throw new Error(`HTTP ${status}`);
  return html;
}

// ---------- Kingdom (Supabase) ----------

async function carregarAlunos() {
  const { data, error } = await supabaseAdmin()
    .from("Student")
    .select(
      'id, status, user:User!userId!inner(name, email, role), ficha:StudentEnrollmentForm(taxId, addressLine, postalCode), perfil:StudentProfile(phone)',
    );
  if (error) throw error;
  return data.map((s) => {
    const user = one(s.user);
    const ficha = one(s.ficha) ?? {};
    const perfil = one(s.perfil) ?? {};
    return {
      studentId: s.id,
      status: s.status,
      role: user?.role,
      nome: capitalizarNome(user?.name),
      email: String(user?.email ?? "").trim().toLowerCase(),
      nif: soDigitos(ficha.taxId),
      morada: String(ficha.addressLine ?? "").replace(/\s+/g, " ").trim(),
      codigoPostal: normalizarCodigoPostal(ficha.postalCode),
      telemovel: normalizarTelemovel(perfil.phone),
    };
  });
}

function motivoExclusao(a) {
  const base = motivoExclusaoBase(a);
  if (base) return base;
  const estados = INCLUIR_EXPERIMENTAIS ? ["ATIVO", "INADIMPLENTE", "EXPERIMENTAL"] : ["ATIVO", "INADIMPLENTE"];
  if (!estados.includes(a.status)) return `estado ${a.status}`;
  return null;
}

// ---------- principal ----------

async function main() {
  console.log(CRIAR ? "MODO: CRIAR (vai gravar no WeoInvoice)\n" : "MODO: ENSAIO (não grava nada — usa --criar para gravar)\n");

  const alunos = await carregarAlunos();
  let existentes = [];
  if (!CRIAR && (!process.env.WEO_EMAIL || !process.env.WEO_PASSWORD)) {
    console.log("(Sem WEO_EMAIL/WEO_PASSWORD: ensaio sem comparar com o WeoInvoice.)\n");
  } else {
    await weoLogin();
    existentes = await weoListarClientes();
  }
  console.log(`Kingdom: ${alunos.length} registos de aluno · WeoInvoice: ${existentes.length} clientes\n`);

  const excluidos = [];
  const jaExistem = [];
  const incompletos = [];
  const aCriar = [];
  const aCompletar = [];

  for (const a of alunos.sort((x, y) => x.nome.localeCompare(y.nome, "pt"))) {
    const motivo = motivoExclusao(a);
    if (motivo) {
      excluidos.push({ ...a, motivo });
      continue;
    }
    const existente = encontrarCliente(existentes, a);
    if (existente) {
      jaExistem.push(a);
      // O WeoInvoice só deixa facturar com NIF, morada e código postal: completa o que faltar com os dados da plataforma.
      const ficha = await weoLerCliente(existente.encid);
      const alteracoes = {};
      if (!ficha.morada && a.morada) alteracoes.address = a.morada;
      if (!ficha.codigoPostal && a.codigoPostal) alteracoes.postcode = a.codigoPostal;
      if (!ficha.telemovel && a.telemovel) alteracoes.mobile = a.telemovel;
      const aindaFalta = [
        !existente.nif && "NIF",
        !ficha.morada && !a.morada && "morada",
        !ficha.codigoPostal && !a.codigoPostal && "código postal",
      ].filter(Boolean);
      // Dois alunos podem bater no mesmo cliente (ex.: irmãos com o NIF do encarregado) — só o primeiro conta.
      const repetido = aCompletar.some((c) => c.cliente.id === existente.id);
      if (!repetido && (Object.keys(alteracoes).length || aindaFalta.length)) aCompletar.push({ ...a, cliente: existente, alteracoes, aindaFalta });
      continue;
    }
    if (EMAIL_SINTETICO.test(a.email)) a.email = ""; // não vale a pena dar ao WeoInvoice um email sem caixa de correio
    const nomeCompleto = a.nome.split(" ").length >= 2;
    const falta = [];
    if (!nomeCompleto) falta.push(`nome completo (está «${a.nome || "vazio"}»)`);
    if (!a.nif) falta.push("NIF");
    else if (!nifValido(a.nif)) falta.push(`NIF inválido (${a.nif})`);
    if (!a.email) falta.push("email");
    if (!a.morada) falta.push("morada");
    if (!a.codigoPostal) falta.push("código postal");
    else if (!/^\d{4}-\d{3}$/.test(a.codigoPostal)) falta.push(`código postal incompleto (${a.codigoPostal})`);
    if (!a.telemovel) falta.push("telemóvel");
    // Nome completo e NIF válido são obrigatórios; o resto é aviso (o cliente é criado na mesma).
    if (!nomeCompleto || !a.nif || !nifValido(a.nif)) incompletos.push({ ...a, falta });
    else aCriar.push({ ...a, avisos: falta });
  }

  console.log(`Excluídos (${excluidos.length}):`);
  for (const a of excluidos) console.log(`  - ${a.nome || "(sem nome)"} <${a.email}> — ${a.motivo}`);
  console.log(`\nJá existem no WeoInvoice (${jaExistem.length}):`);
  for (const a of jaExistem) console.log(`  - ${a.nome}`);
  console.log(`\nJá existem mas estão incompletos no WeoInvoice (${aCompletar.length}):`);
  const rotulo = { address: "morada", postcode: "código postal", mobile: "telemóvel" };
  for (const c of aCompletar) {
    const muda = Object.entries(c.alteracoes).map(([k, v]) => `${rotulo[k]} → ${v}`);
    const falta = c.aindaFalta.length ? `  [falta também na plataforma: ${c.aindaFalta.join(", ")} — preenche à mão]` : "";
    console.log(`  ~ ${c.cliente.nome}: ${muda.join(" | ") || "nada a completar"}${falta}`);
  }
  console.log(`\nNão dá para criar — faltam dados (${incompletos.length}):`);
  for (const a of incompletos) console.log(`  - ${a.nome || "(sem nome)"} <${a.email}> — falta: ${a.falta.join(", ")}`);
  console.log(`\nA criar (${aCriar.length}):`);
  for (const a of aCriar) {
    console.log(`  + ${a.nome} | ${a.email} | NIF ${a.nif} | ${a.morada || "—"} | ${a.codigoPostal || "—"} | ${a.telemovel || "—"}`);
    if (a.avisos.length) console.log(`      aviso: falta ${a.avisos.join(", ")}`);
  }

  if (!CRIAR) {
    console.log("\nEnsaio terminado. Nada foi gravado.");
    return;
  }

  const completar = aCompletar.filter((c) => Object.keys(c.alteracoes).length);
  if (completar.length) console.log(`\nA completar ${completar.length} cliente(s)...`);
  for (const c of completar) {
    try {
      await weoActualizarCliente(c.cliente.encid, c.alteracoes);
      console.log(`  OK   ${c.cliente.nome}`);
    } catch (e) {
      console.log(`  ERRO ${c.cliente.nome}: ${e.message} — parei.`);
      process.exit(1);
    }
  }

  const lote = SO ? aCriar.slice(0, SO) : aCriar;
  console.log(`\nA criar ${lote.length} cliente(s)...`);
  for (const a of lote) {
    await weoCriarCliente(a);
    const depois = await weoListarClientes();
    const ok = depois.some((c) => c.nif === a.nif || semAcentos(c.nome) === semAcentos(a.nome));
    console.log(`  ${ok ? "OK  " : "ERRO"} ${a.nome}${ok ? "" : " — não apareceu na lista depois do envio; parei."}`);
    if (!ok) process.exit(1);
  }
  console.log("\nConcluído.");
}

main().catch((e) => {
  console.error("\nErro:", e.message ?? e);
  process.exit(1);
});
