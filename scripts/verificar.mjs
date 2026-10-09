/**
 * Verificação antes de publicar: tipos (TypeScript) + testes automáticos (Vitest).
 * Uso: npm run verificar
 * Mostra só o resumo quando tudo passa; os detalhes aparecem apenas se algo falhar.
 */
import { spawnSync } from "node:child_process";

function run(label, command) {
  process.stdout.write(`${label}… `);
  const started = Date.now();
  const res = spawnSync(command, { shell: true, encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0" } });
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  const output = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  return { ok: res.status === 0, output, secs };
}

let failed = false;

const types = run("1/2 A verificar os tipos (TypeScript)", "npx tsc --noEmit -p tsconfig.json");
if (types.ok) {
  console.log(`✓ sem erros (${types.secs}s)`);
} else {
  failed = true;
  console.log(`✗ com erros (${types.secs}s)\n`);
  console.log(types.output.split("\n").filter((l) => l.includes("error TS")).slice(0, 30).join("\n") || types.output);
}

const tests = run("2/2 A correr os testes (Vitest)", "npx vitest run");
const summary = tests.output
  .split("\n")
  .filter((l) => /^\s*(Test Files|Tests)\s/.test(l))
  .map((l) => l.trim())
  .join(" · ");
if (tests.ok) {
  console.log(`✓ ${summary || "todos passaram"} (${tests.secs}s)`);
} else {
  failed = true;
  console.log(`✗ ${summary || "falharam"} (${tests.secs}s)\n`);
  const lines = tests.output.split("\n");
  const firstFail = lines.findIndex((l) => l.includes("FAIL"));
  console.log(lines.slice(Math.max(0, firstFail), firstFail + 40).join("\n"));
}

console.log(failed ? "\nResultado: ✗ há problemas — copia o que aparece acima para o Claude." : "\nResultado: ✓ tudo certo.");
process.exit(failed ? 1 : 0);
