/**
 * Remove o fundo escuro do PNG «sem fundo» e gera variantes:
 * - kfs-logotipo-transparent.png (completo)
 * - kfs-logotipo-emblem.png (emblema: coroa + octógono, sem texto)
 * npm run process:brand-logo
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const BRAND_BG = { r: 18, g: 20, b: 22 }; // #121416
/** Parte superior do master (só o símbolo, sem «KINGDOM FIGHT SCHOOL»). */
const EMBLEM_HEIGHT_RATIO = 0.58;

function colorDistance(r, g, b) {
  const dr = r - BRAND_BG.r;
  const dg = g - BRAND_BG.g;
  const db = b - BRAND_BG.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function removeDarkBackground(srcPath, outPath) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const hardCutoff = 48;
  const softRange = 36;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const d = colorDistance(r, g, b);
    const isNearBlack = r < 22 && g < 22 && b < 26;

    if (d < hardCutoff || isNearBlack) {
      data[i + 3] = 0;
    } else if (d < hardCutoff + softRange) {
      const t = (d - hardCutoff) / softRange;
      data[i + 3] = Math.round(Math.min(255, Math.max(0, t * 255)));
    }
  }

  const fullBuf = Buffer.isBuffer(data) ? data : Buffer.from(data);

  await sharp(fullBuf, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  return { width: info.width, height: info.height };
}

async function extractEmblem(fullPath, outPath) {
  const meta = await sharp(fullPath).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const cropH = Math.min(height, Math.round(height * EMBLEM_HEIGHT_RATIO));
  if (width < 1 || cropH < 1) {
    throw new Error(`Dimensões inválidas para emblema: ${width}×${height}`);
  }

  // `extract` falha em alguns PNG gerados via raw; crop pelo topo com resize.
  await sharp(fullPath)
    .resize(width, cropH, { fit: "cover", position: "north" })
    .trim({ threshold: 12 })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function main() {
  const root = process.cwd();
  const brandDir = path.join(root, "public", "brand");
  const src = path.join(brandDir, "kfs-logotipo-sem-fundo.png");
  const fullOut = path.join(brandDir, "kfs-logotipo-transparent.png");
  const emblemOut = path.join(brandDir, "kfs-logotipo-emblem.png");

  const full = await removeDarkBackground(src, fullOut);
  await extractEmblem(fullOut, emblemOut);

  const emblemMeta = await sharp(emblemOut).metadata();
  console.log(`Gerado ${fullOut} (${full.width}×${full.height})`);
  console.log(`Gerado ${emblemOut} (${emblemMeta.width}×${emblemMeta.height})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
