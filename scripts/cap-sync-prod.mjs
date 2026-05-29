/**
 * Sincroniza Capacitor com URL de produção no WebView (Android/iOS).
 * URL: CAPACITOR_SERVER_URL ou https://kingdomfight.com
 */
import { spawnSync } from "child_process";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

const root = process.cwd();
loadEnv({ path: resolve(root, ".env.local") });
loadEnv({ path: resolve(root, ".env") });

const url =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://kingdomfight.com";

process.env.CAPACITOR_SERVER_URL = url.replace(/\/$/, "");

console.log(`Capacitor sync → server.url = ${process.env.CAPACITOR_SERVER_URL}`);

const r = spawnSync("npx", ["cap", "sync"], { stdio: "inherit", shell: true, env: process.env });
process.exit(r.status ?? 1);
