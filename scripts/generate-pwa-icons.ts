/**
 * Ícones PWA + favicon a partir de `public/brand/kfs-app-icon.png` (se existir).
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

/** Escala do logo no quadrado — ~90% equilibra legibilidade vs. zona segura maskable. */
const MANIFEST_ICON_SCALE = 0.9;
const OPAQUE_ICON_SCALE_READY = 0.82;

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function main() {
  const root = process.cwd();
  const srcPath = await resolveBrandIconSourcePath(root);
  const isReadySource = path.basename(srcPath) === "kfs-app-icon.png";
  const bufOpaque = await loadBrandIconPngBuffer(root);
  const bufAlpha = isReadySource
    ? await loadBrandIconPngBuffer(root, { keepAlpha: true })
    : bufOpaque;

  const outDir = path.join(root, "public", "icons");
  const appDir = path.join(root, "app");
  await fs.mkdir(outDir, { recursive: true });

  /** Logo com alpha — o SO pinta `background_color` por baixo (sem «caixa» preta no splash). */
  async function iconWithTransparentBg(size: number, scale: number) {
    const inner = Math.round(size * scale);
    const logo = await sharp(bufAlpha)
      .resize(inner, inner, {
        fit: "contain",
        background: TRANSPARENT,
      })
      .toBuffer();

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: TRANSPARENT,
      },
    })
      .composite([{ input: logo, gravity: "centre" }])
      .png()
      .toBuffer();
  }

  /** Ícone opaco (maskable / favicon pequeno). */
  async function iconOpaque(size: number, maskable: boolean) {
    const scale = isReadySource ? OPAQUE_ICON_SCALE_READY : maskable ? 0.68 : 0.78;
    const inner = Math.round(size * scale);
    const logo = await sharp(bufAlpha)
      .resize(inner, inner, {
        fit: "contain",
        background: TRANSPARENT,
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

  const useTransparentForManifest = isReadySource;

  const [png48, png192, png512, mask512, apple180] = await Promise.all([
    iconOpaque(48, false),
    useTransparentForManifest ? iconWithTransparentBg(192, MANIFEST_ICON_SCALE) : iconOpaque(192, false),
    useTransparentForManifest ? iconWithTransparentBg(512, MANIFEST_ICON_SCALE) : iconOpaque(512, false),
    iconOpaque(512, true),
    useTransparentForManifest ? iconWithTransparentBg(180, MANIFEST_ICON_SCALE) : iconOpaque(180, false),
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
    `Ícones PWA gerados (${path.basename(srcPath)}${
      useTransparentForManifest ? ", manifest com alpha" : ""
    })`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
