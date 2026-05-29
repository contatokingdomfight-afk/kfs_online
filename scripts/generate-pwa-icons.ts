/**
 * Gera ícones PWA a partir do logotipo sem fundo em `public/brand/`.
 * Executar: npm run generate:pwa-icons
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const BRAND_BG = "#121416";

async function main() {
  const root = process.cwd();
  const src = path.join(root, "public", "brand", "kfs-logotipo-transparent.png");
  await fs.access(src).catch(() => {
    throw new Error(`Ficheiro não encontrado: ${src}`);
  });

  const outDir = path.join(root, "public", "icons");
  await fs.mkdir(outDir, { recursive: true });

  const buf = await fs.readFile(src);

  async function squareIcon(size: number, maskable: boolean) {
    const bg = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BRAND_BG,
      },
    });

    const inner = Math.round(maskable ? size * 0.72 : size * 0.88);
    const logo = await sharp(buf)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    const top = Math.round((size - inner) / 2);
    const left = top;

    return bg
      .composite([{ input: logo, top, left }])
      .png()
      .toBuffer();
  }

  const [png192, png512, mask512, apple180] = await Promise.all([
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
  ]);

  console.log("Ícones PWA gerados em public/icons/ (fundo #121416)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
