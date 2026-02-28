/**
 * Envia todos os batches para o GitHub via chamadas ao MCP.
 * Este script apenas imprime os comandos; você executa-os manualmente ou via Cursor.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");

// Gera cada batch e imprime o payload
for (let i = 0; i <= 50; i++) {
  try {
    execSync(`node scripts/prepare-push-batch.js ${i}`, { cwd: root, encoding: "utf8" });
    const batchPath = path.join(root, "scripts", "push-batch.json");
    if (!fs.existsSync(batchPath)) continue;
    const payload = JSON.parse(fs.readFileSync(batchPath, "utf8"));
    if (!payload.files || payload.files.length === 0) continue;
    
    console.log(`\n=== Batch ${i}: ${payload.files.length} files ===`);
    payload.files.forEach((f, idx) => console.log(`  ${idx + 1}. ${f.path}`));
    
    // Aqui você chamaria o MCP via CallMcpTool; por agora só listamos
    // Para executar via Cursor: CallMcpTool(server: "user-github_kfs", toolName: "push_files", arguments: payload)
  } catch (e) {
    console.error(`Batch ${i} error:`, e.message);
  }
}

console.log("\n✅ Todos os batches gerados. Use o MCP push_files para cada um.");
