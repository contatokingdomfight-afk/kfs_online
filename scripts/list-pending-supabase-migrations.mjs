import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_EU_REMOTE_MIGRATION_NAMES } from "./lib/supabase-eu-remote-migration-names.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "../supabase/migrations");

const remote = SUPABASE_EU_REMOTE_MIGRATION_NAMES;

function slug(b) {
  return b.replace(/^\d+_/, "");
}

function satisfied(b) {
  if (remote.has(b)) return true;
  const s = slug(b);
  if (remote.has(s)) return true;
  if (s === "physical_assessment_request" && remote.has("physical_assessment_request_table")) return true;
  if (s === "physical_assessment_request_grants_status_text" && remote.has("physical_assessment_request_status_to_text"))
    return true;
  return false;
}

const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
const missing = files.map((f) => f.slice(0, -4)).filter((b) => !satisfied(b));
console.log(JSON.stringify(missing, null, 2));
console.error("COUNT", missing.length);
