/**
 * Prepara assets/ para @capacitor/assets (ícone + splash KFS).
 * npm run generate:capacitor-assets
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const BRAND_BG = "#121416";
const root = process.cwd();
const logoPath = path.join(root, "public", "brand", "kfs-logotipo-sem-fundo.png");
const fallbackIcon = path.join(root, "public", "icons", "icon-512.png");
const assetsDir = path.join(root, "assets");

async function main() {
  let src;
  try {
    await fs.access(logoPath);
    src = logoPath;
  } catch {
    src = fallbackIcon;
  }

  await fs.mkdir(assetsDir, { recursive: true });
  const buf = await fs.readFile(src);

  await sharp(buf)
    .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 64,
      bottom: 64,
      left: 64,
      right: 64,
      background: BRAND_BG,
    })
    .flatten({ background: BRAND_BG })
    .png()
    .toFile(path.join(assetsDir, "icon-only.png"));

  const splashSize = 2732;
  const inner = Math.round(splashSize * 0.42);
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
