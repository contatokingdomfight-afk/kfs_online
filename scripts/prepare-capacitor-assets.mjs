/**
 * Prepara assets/ para @capacitor/assets (ícone + splash KFS).
 * npm run generate:capacitor-assets
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { loadBrandIconPngBuffer } from "./prepare-brand-icon-source.mjs";

const BRAND_BG = "#121416";
const root = process.cwd();
const assetsDir = path.join(root, "assets");

async function main() {
  const buf = await loadBrandIconPngBuffer(root);

  await fs.mkdir(assetsDir, { recursive: true });

  await sharp(buf)
    .resize(1024, 1024, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: 48,
      bottom: 48,
      left: 48,
      right: 48,
      background: BRAND_BG,
    })
    .flatten({ background: BRAND_BG })
    .png()
    .toFile(path.join(assetsDir, "icon-only.png"));

  const splashSize = 2732;
  const inner = Math.round(splashSize * 0.38);
  const logo = await sharp(buf)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: splashSize, height: splashSize, channels: 4, background: BRAND_BG },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(path.join(assetsDir, "splash.png"));

  console.log("Capacitor assets preparados em assets/ (fundo #121416)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
