/**
 * Rotina de facturação do mês num só comando:
 *   1) weo-clientes  — cria os alunos novos e completa os clientes incompletos no WeoInvoice;
 *   2) weo-faturas   — mostra o que vai ser emitido (ensaio);
 *   3) pergunta, emite a 1.ª, pergunta outra vez e emite as restantes.
 * A anulação (weo-anular) fica de fora de propósito: é irreversível e não faz parte da rotina.
 *
 * Uso:
 *   npm run faturacao                       → mês corrente
 *   npm run faturacao -- --mes=2026-10      → outro mês de referência
 *   --vencimento=AAAA-MM-DD  (por omissão: último dia do mês de referência, ou hoje se esse dia já passou)
 *   --tipo=ft                (por omissão: fatura-recibo)
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const pasta = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (nome) => args.find((a) => a.startsWith(`--${nome}=`))?.split("=")[1];

const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Lisbon" });
const MES = arg("mes") ?? hoje.slice(0, 7);
if (!/^\d{4}-\d{2}$/.test(MES)) {
  console.error("Formato: --mes=AAAA-MM");
  process.exit(1);
}
const [ano, mes] = MES.split("-").map(Number);
const ultimoDia = `${MES}-${String(new Date(Date.UTC(ano, mes, 0)).getUTCDate()).padStart(2, "0")}`;
// O WeoInvoice não deixa o vencimento ser anterior à emissão (hoje).
const VENCIMENTO = arg("vencimento") ?? (ultimoDia >= hoje ? ultimoDia : hoje);
const extra = [`--mes=${MES}`, `--vencimento=${VENCIMENTO}`, ...(arg("tipo") ? [`--tipo=${arg("tipo")}`] : [])];

function correr(script, ...opcoes) {
  const r = spawnSync(process.execPath, [join(pasta, script), ...opcoes], { stdio: "inherit" });
  return r.status ?? 1;
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const sim = async (pergunta) => /^s(im)?$/i.test((await rl.question(`\n${pergunta} (s/n) `)).trim());
const titulo = (t) => console.log(`\n${"=".repeat(70)}\n${t}\n${"=".repeat(70)}`);

async function main() {
  console.log(`Facturação de ${MES} · emissão hoje (${hoje}) · vencimento ${VENCIMENTO}`);
  if (ultimoDia < hoje && !arg("vencimento")) {
    console.log(`(O mês ${MES} já acabou: o vencimento fica hoje, porque não pode ser anterior à emissão.)`);
  }

  titulo("1/3 · Clientes — criar alunos novos e completar dados em falta");
  if (correr("weo-clientes.mjs", "--criar") !== 0) {
    console.log("\nO passo dos clientes falhou — parei antes de facturar. Vê o erro acima.");
    return 1;
  }

  titulo("2/3 · Facturas — o que vai ser emitido (ensaio, não emite nada)");
  if (correr("weo-faturas.mjs", ...extra) !== 0) {
    console.log("\nO ensaio falhou — nada foi emitido. Vê o erro acima.");
    return 1;
  }

  titulo("3/3 · Emitir");
  if (!(await sim("Emitir agora as facturas da lista «A emitir»?"))) {
    console.log("Ok, nada foi emitido.");
    return 0;
  }
  const primeira = correr("weo-faturas.mjs", ...extra, "--emitir", "--so=1");
  if (primeira !== 0) {
    console.log("\nA primeira factura deu erro — parei. Vê o resumo acima.");
    return 1;
  }
  if (!(await sim("A primeira ficou bem no WeoInvoice? Emitir as restantes?"))) {
    console.log("Ok, parei. As restantes ficam para a próxima vez que correres (a emitida não se repete).");
    return 0;
  }
  const resto = correr("weo-faturas.mjs", ...extra, "--emitir");
  console.log(resto === 0 ? "\nFacturação do mês concluída." : "\nTerminou com erros — vê o resumo acima e corre de novo depois de resolver.");
  return resto;
}

main()
  .then((codigo) => {
    rl.close();
    process.exitCode = codigo;
  })
  .catch((e) => {
    rl.close();
    console.error("\nErro:", e.message ?? e);
    process.exitCode = 1;
  });
