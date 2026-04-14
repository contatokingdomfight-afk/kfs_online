/**
 * Aplica export JSON (auth.users + auth.identities) gerado a partir do legado (MCP).
 * Destino: DATABASE_URL (projeto EU). Usa ON CONFLICT DO NOTHING.
 *
 * Uso: node scripts/apply-legacy-auth-export-to-eu.mjs [caminho.json]
 * Default: scripts/tmp-legacy-auth-export.json
 */
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import pg from "pg";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

/** Sem `confirmed_at`: em Supabase recente é coluna gerada. */
const USER_COLS = [
  "instance_id",
  "id",
  "aud",
  "role",
  "email",
  "encrypted_password",
  "email_confirmed_at",
  "invited_at",
  "confirmation_token",
  "confirmation_sent_at",
  "recovery_token",
  "recovery_sent_at",
  "email_change_token_new",
  "email_change",
  "email_change_sent_at",
  "last_sign_in_at",
  "raw_app_meta_data",
  "raw_user_meta_data",
  "is_super_admin",
  "created_at",
  "updated_at",
  "phone",
  "phone_confirmed_at",
  "phone_change",
  "phone_change_token",
  "phone_change_sent_at",
  "email_change_token_current",
  "email_change_confirm_status",
  "banned_until",
  "reauthentication_token",
  "reauthentication_sent_at",
  "is_sso_user",
  "deleted_at",
  "is_anonymous",
];

/** Sem `email` em identities: coluna gerada no Supabase recente. */
const IDENTITY_COLS = [
  "provider_id",
  "user_id",
  "identity_data",
  "provider",
  "last_sign_in_at",
  "created_at",
  "updated_at",
  "id",
];

function userValues(row) {
  return USER_COLS.map((c) => {
    let v = row[c];
    if (v === undefined) v = null;
    if (c === "encrypted_password" && v === "") v = null;
    if (
      (c === "raw_app_meta_data" || c === "raw_user_meta_data") &&
      v != null &&
      typeof v === "object"
    ) {
      return v;
    }
    return v;
  });
}

function identityValues(row) {
  return IDENTITY_COLS.map((c) => {
    const v = row[c];
    if (c === "identity_data" && v != null && typeof v === "object") return v;
    return v ?? null;
  });
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL em falta.");
  process.exit(1);
}

const inPath =
  process.argv[2] ??
  path.join(process.cwd(), "scripts/tmp-legacy-auth-export.json");
const { users, identities } = JSON.parse(fs.readFileSync(inPath, "utf8"));

if (!Array.isArray(users) || !Array.isArray(identities)) {
  console.error("JSON inválido: esperava { users: [], identities: [] }");
  process.exit(1);
}

const ph = (n) => Array.from({ length: n }, (_, i) => `$${i + 1}`).join(", ");
const sqlUsers = `INSERT INTO auth.users (${USER_COLS.map((c) => `"${c}"`).join(", ")}) VALUES (${ph(USER_COLS.length)}) ON CONFLICT (id) DO NOTHING`;
const sqlIdent = `INSERT INTO auth.identities (${IDENTITY_COLS.map((c) => `"${c}"`).join(", ")}) VALUES (${ph(IDENTITY_COLS.length)}) ON CONFLICT (id) DO NOTHING`;

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  for (const row of users) {
    await client.query(sqlUsers, userValues(row));
  }
  console.error(`OK: auth.users processados (${users.length}).`);
  for (const row of identities) {
    await client.query(sqlIdent, identityValues(row));
  }
  console.error(`OK: auth.identities processados (${identities.length}).`);
} finally {
  await client.end();
}
