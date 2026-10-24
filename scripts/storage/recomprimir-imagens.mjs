/**
 * Recomprime as imagens que já estão no Supabase Storage e põe-lhes cache de 1 ano.
 * Reduz o "Cached Egress": cada visualização de uma foto conta bytes, por isso fotos de 3 MB pesam muito.
 *
 * - Substitui cada ficheiro no MESMO caminho (os URLs guardados na BD continuam válidos).
 * - Mantém o formato pelo nome (jpg/png/webp); GIFs e não-imagens ficam como estão.
 * - Só troca o conteúdo se ficar pelo menos 10% mais pequeno; senão reenvia o original só para fixar a cache.
 * - Antes de substituir, guarda o original em scripts/storage/backup-AAAA-MM-DD/<bucket>/<caminho>.
 *
 * Uso:
 *   node scripts/storage/recomprimir-imagens.mjs            → simulação (não altera nada)
 *   node scripts/storage/recomprimir-imagens.mjs --aplicar  → aplica
 *   node scripts/storage/recomprimir-imagens.mjs --aplicar --bucket tribe-media
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../../.env") });

/** Lado máximo por bucket (igual ao que o browser faz agora nos novos uploads). */
const BUCKETS = {
  "tribe-media": 1600,
  "event-banners": 1920,
  "product-images": 1400,
  avatars: 1000,
};
const CACHE = "31536000";
const MIN_BYTES = 150 * 1024;

const args = process.argv.slice(2);
const APPLY = args.includes("--aplicar");
const onlyBucket = args.includes("--bucket") ? args[args.indexOf("--bucket") + 1] : null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });
const backupDir = path.join(__dirname, `backup-${new Date().toISOString().slice(0, 10)}`);

async function listAll(bucket, prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) out.push(...(await listAll(bucket, full)));
      else out.push({ path: full, size: item.metadata?.size ?? 0, mimetype: item.metadata?.mimetype ?? "", cache: item.metadata?.cacheControl ?? "" });
    }
    if (data.length < 1000) break;
  }
  return out;
}

function formatOf(p, mimetype) {
  const ext = path.extname(p).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg" || mimetype === "image/jpeg") return "jpeg";
  if (ext === ".png" || mimetype === "image/png") return "png";
  if (ext === ".webp" || mimetype === "image/webp") return "webp";
  return null;
}

async function compress(buf, fmt, maxSide) {
  const img = sharp(buf, { failOn: "none" }).rotate().resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true });
  if (fmt === "jpeg") return img.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  if (fmt === "png") return img.png({ compressionLevel: 9, effort: 10 }).toBuffer();
  return img.webp({ quality: 80 }).toBuffer();
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
let totalBefore = 0;
let totalAfter = 0;

for (const [bucket, maxSide] of Object.entries(BUCKETS)) {
  if (onlyBucket && bucket !== onlyBucket) continue;
  let files;
  try {
    files = await listAll(bucket);
  } catch (e) {
    console.warn(`⚠ ${e.message} (bucket ignorado)`);
    continue;
  }
  console.log(`\n== ${bucket}: ${files.length} ficheiros`);

  for (const f of files) {
    const fmt = formatOf(f.path, f.mimetype);
    if (!fmt) continue;
    const needsCache = !f.cache.includes(CACHE);
    const tryCompress = f.size >= MIN_BYTES;
    if (!tryCompress && !needsCache) continue;

    const { data: blob, error } = await supabase.storage.from(bucket).download(f.path);
    if (error) {
      console.warn(`  ⚠ ${f.path}: ${error.message}`);
      continue;
    }
    const original = Buffer.from(await blob.arrayBuffer());
    let next = original;
    if (tryCompress) {
      try {
        const out = await compress(original, fmt, maxSide);
        if (out.length < original.length * 0.9) next = out;
      } catch (e) {
        console.warn(`  ⚠ ${f.path}: não deu para comprimir (${e.message})`);
      }
    }
    totalBefore += original.length;
    totalAfter += next.length;
    const label = next === original ? "só cache" : `${kb(original.length)} → ${kb(next.length)}`;
    console.log(`  ${APPLY ? "✔" : "·"} ${f.path}  ${label}`);
    if (!APPLY) continue;

    if (next !== original) {
      const dest = path.join(backupDir, bucket, f.path);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, original);
    }
    const { error: upErr } = await supabase.storage.from(bucket).update(f.path, next, {
      contentType: `image/${fmt}`,
      cacheControl: CACHE,
      upsert: true,
    });
    if (upErr) console.warn(`  ⚠ ${f.path}: falhou o envio (${upErr.message})`);
  }
}

console.log(`\nTotal processado: ${kb(totalBefore)} → ${kb(totalAfter)}${APPLY ? "" : "  (simulação — corre com --aplicar)"}`);
if (APPLY) console.log(`Originais guardados em ${backupDir}`);
