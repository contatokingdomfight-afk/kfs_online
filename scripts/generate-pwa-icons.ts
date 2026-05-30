/**
 * Ícones PWA + favicon a partir de `public/brand/kfs-emblem-icon.png` (se existir).
 * Executar: npm run generate:pwa-icons
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import {
  ICON_BG_RGBA,
  loadBrandIconPngBuffer,
  resolveBrandIconSourcePath,
} from "./prepare-brand-icon-source.mjs";

async function main() {
  const root = process.cwd();
  const srcPath = await resolveBrandIconSourcePath(root);
  const isReadySource = path.basename(srcPath) === "kfs-app-icon.png";
  const buf = await loadBrandIconPngBuffer(root);

  const outDir = path.join(root, "public", "icons");
  const appDir = path.join(root, "app");
  await fs.mkdir(outDir, { recursive: true });

  /** iOS/Android cortam cantos (~squircle); conteúdo na zona central ~76–80%. */
  async function squareIcon(size: number, maskable: boolean) {
    const scale = isReadySource
      ? maskable ? 0.72 : 0.96
      : maskable
        ? 0.68
        : 0.78;
    const inner = Math.round(size * scale);
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
        background: ICON_BG_RGBA,
      },
    })
      .composite([{ input: logo, gravity: "centre" }])
      .png()
      .toBuffer();
  }

  const [png48, png192, png512, mask512, apple180] = await Promise.all([
    squareIcon(48, false),
    squareIcon(192, false),
    squareIcon(512, false),
    squareIcon(512, true),
    squareIcon(180, false),
  ]);

  await Promise.all([
    fs.writeFile(path.join(outDir, "kfs-emblem-192.png"), png192),
    fs.writeFile(path.join(outDir, "kfs-emblem-512.png"), png512),
    fs.writeFile(path.join(outDir, "kfs-emblem-512-maskable.png"), mask512),
    fs.writeFile(path.join(outDir, "kfs-emblem-180.png"), apple180),
    fs.writeFile(path.join(outDir, "icon-192.png"), png192),
    fs.writeFile(path.join(outDir, "icon-512.png"), png512),
    fs.writeFile(path.join(outDir, "icon-512-maskable.png"), mask512),
    fs.writeFile(path.join(outDir, "apple-touch-icon.png"), apple180),
    fs.writeFile(path.join(appDir, "icon.png"), png48),
    fs.writeFile(path.join(appDir, "apple-icon.png"), apple180),
  ]);

  console.log(
    `Ícones PWA gerados (${path.basename(srcPath)}${isReadySource ? ", fonte pronta" : ", emblema recortado"}, fundo #121416)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
