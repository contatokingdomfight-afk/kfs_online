/**
 * Ícones PWA + favicon da app (emblema transparente).
 * Executar: npm run generate:pwa-icons
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

async function main() {
  const root = process.cwd();
  const src = path.join(root, "public", "brand", "kfs-logotipo-emblem.png");
  await fs.access(src).catch(() => {
    throw new Error(`Ficheiro não encontrado: ${src} — corre npm run process:brand-logo`);
  });

  const buf = await sharp(await fs.readFile(src))
    .trim({ threshold: 15 })
    .png()
    .toBuffer();

  const outDir = path.join(root, "public", "icons");
  const appDir = path.join(root, "app");
  await fs.mkdir(outDir, { recursive: true });

  async function squareIcon(size: number, maskable: boolean) {
    const inner = Math.round(maskable ? size * 0.62 : size * 0.8);
    const logo = await sharp(buf)
      .resize(inner, inner, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: logo, gravity: "centre" }])
      .png()
      .toBuffer();
  }

  const [png32, png192, png512, mask512, apple180] = await Promise.all([
    squareIcon(32, false),
    squareIcon(192, false),
    squareIcon(512, false),
    squareIcon(512, true),
    squareIcon(180, false),
  ]);

  await Promise.all([
    fs.writeFile(path.join(outDir, "icon-192.png"), png192),
    fs.writeFile(path.join(outDir, "icon-512.png"), png512),
    fs.writeFile(path.join(outDir, "icon-512-maskable.png"), mask512),
    fs.writeFile(path.join(outDir, "apple-touch-icon.png"), apple180),
    fs.writeFile(path.join(appDir, "icon.png"), png32),
    fs.writeFile(path.join(appDir, "apple-icon.png"), apple180),
  ]);

  console.log("Ícones em public/icons/ + app/icon.png + app/apple-icon.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
