/**
 * Remove o fundo escuro do PNG «sem fundo» (que não tem canal alpha real).
 * Gera `public/brand/kfs-logotipo-transparent.png`.
 * npm run process:brand-logo
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const BRAND_BG = { r: 18, g: 20, b: 22 }; // #121416

function colorDistance(r, g, b) {
  const dr = r - BRAND_BG.r;
  const dg = g - BRAND_BG.g;
  const db = b - BRAND_BG.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function main() {
  const root = process.cwd();
  const src = path.join(root, "public", "brand", "kfs-logotipo-sem-fundo.png");
  const out = path.join(root, "public", "brand", "kfs-logotipo-transparent.png");

  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

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

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(out);

  const check = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  const px = info.width * info.height;
  for (let i = 0; i < check.data.length; i += 4) {
    if (check.data[i + 3] < 20) transparent++;
  }
  console.log(`Gerado ${out} — pixels transparentes: ${((transparent / px) * 100).toFixed(1)}%`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
