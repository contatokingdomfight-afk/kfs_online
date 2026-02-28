const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const root = path.join(__dirname, "..");
function unquoteGitPath(line) {
  let p = line.trim();
  if (!p.startsWith('"') || !p.endsWith('"')) return p;
  p = p.slice(1, -1);
  const bytes = [];
  let decoded = "";
  for (let i = 0; i < p.length; ) {
    if (p[i] === "\\" && p.slice(i + 1, i + 4).match(/^[0-7]{3}$/)) {
      bytes.push(parseInt(p.slice(i + 1, i + 4), 8));
      i += 4;
    } else {
      if (bytes.length) {
        decoded += Buffer.from(bytes).toString("utf8");
        bytes.length = 0;
      }
      decoded += p[i];
      i++;
    }
  }
  if (bytes.length) decoded += Buffer.from(bytes).toString("utf8");
  return decoded;
}
function parseGitPaths(stdout) {
  const lines = stdout.split(/\r?\n/).filter((s) => s.trim());
  return lines.map((line) => unquoteGitPath(line));
}
const out = execSync("git ls-files", { cwd: root, encoding: "utf8" });
const all = parseGitPaths(out);
const skip = new Set([
  "README.md", ".gitignore", ".env.example", "package.json", "next.config.mjs",
  "tsconfig.json", "vercel.json",
  "DOCS/DESIGN SYSTEM - TOKENS OFICIAIS.md", "DOCS/Deploy_Vercel_kingdomfight.md",
  "DOCS/Especificacao_Plataforma_Kingdom_Digital.md", "DOCS/Login_Google_Producao_Hostinger.md",
  "DOCS/Login_Google_Supabase.md",
]);
const rest = all.filter((p) => !skip.has(p));
console.log("First 15 paths to push:");
rest.slice(0, 15).forEach((p, i) => {
  const full = path.join(root, p);
  const exists = fs.existsSync(full);
  console.log(i + 1, exists ? "OK" : "MISS", p);
});
