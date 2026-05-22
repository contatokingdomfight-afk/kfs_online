/**
 * Prepara assets/ para @capacitor/assets (ícone + splash KFS).
 * npm run generate:capacitor-assets
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const BRAND_RED = "#ED1C24";
const root = process.cwd();
const logoPath = path.join(root, "KFS Logo.png");
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
    .resize(1024, 1024, { fit: "contain", background: BRAND_RED })
    .flatten({ background: BRAND_RED })
    .png()
    .toFile(path.join(assetsDir, "icon-only.png"));

  const splashSize = 2732;
  const inner = Math.round(splashSize * 0.35);
  const logo = await sharp(buf).resize(inner, inner, { fit: "contain", background: BRAND_RED }).toBuffer();

  await sharp({
    create: { width: splashSize, height: splashSize, channels: 4, background: BRAND_RED },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(path.join(assetsDir, "splash.png"));

  console.log("Capacitor assets preparados em assets/ (icon-only.png, splash.png)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
