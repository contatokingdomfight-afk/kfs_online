/**
 * Prepara assets/ para @capacitor/assets (ícone + splash KFS).
 * npm run generate:capacitor-assets
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { loadBrandIconPngBuffer } from "./prepare-brand-icon-source.mjs";

const BRAND_BG = "#121416";
/** Alinhado com `MANIFEST_ICON_SCALE` em generate-pwa-icons.ts */
const ICON_SCALE = 0.9;
const root = process.cwd();
const assetsDir = path.join(root, "assets");

async function main() {
  const buf = await loadBrandIconPngBuffer(root);

  await fs.mkdir(assetsDir, { recursive: true });

  const iconSize = 1024;
  const iconInner = Math.round(iconSize * ICON_SCALE);
  const iconLogo = await sharp(buf)
    .resize(iconInner, iconInner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: {
      width: iconSize,
      height: iconSize,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .composite([{ input: iconLogo, gravity: "centre" }])
    .flatten({ background: BRAND_BG })
    .png()
    .toFile(path.join(assetsDir, "icon-only.png"));

  const splashSize = 2732;
  const splashInner = Math.round(splashSize * 0.38);
  const splashLogo = await sharp(buf)
    .resize(splashInner, splashInner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: splashSize, height: splashSize, channels: 4, background: BRAND_BG },
  })
    .composite([{ input: splashLogo, gravity: "centre" }])
    .png()
    .toFile(path.join(assetsDir, "splash.png"));

  console.log("Capacitor assets preparados em assets/ (fundo #121416)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
