/**
 * Prepara buffer PNG com alpha a partir do ícone oficial ou do emblema gerado.
 * Usado por generate-pwa-icons e prepare-capacitor-assets.
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

/** PNG 1024×1024 pronto (emblema centrado, ~15% margem, fundo #121416) — prioridade máxima. */
const APP_ICON_READY = "kfs-app-icon.png";
const OFFICIAL_ICON = "kfs-emblem-icon.png";

/** Fundo dos ícones PWA (grafite KFS — alinhado ao manifest). */
export const ICON_BG_RGBA = { r: 18, g: 20, b: 22, alpha: 255 };

function removeNearWhiteRgba(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);

    if (min >= 248) {
      data[i + 3] = 0;
    } else if (min >= 230 && max >= 240) {
      const t = (min - 230) / 18;
      data[i + 3] = Math.round(Math.max(0, 255 * (1 - t)));
    }
  }
}

export async function resolveBrandIconSourcePath(root = process.cwd()) {
  const brandDir = path.join(root, "public", "brand");
  const ready = path.join(brandDir, APP_ICON_READY);
  try {
    await fs.access(ready);
    return ready;
  } catch {
    /* continua */
  }
  const official = path.join(brandDir, OFFICIAL_ICON);
  try {
    await fs.access(official);
    return official;
  } catch {
    return path.join(brandDir, "kfs-logotipo-emblem.png");
  }
}

/** Inclui coroa + octógono + lutador; corta antes do texto «KINGDOM». */
const OFFICIAL_SYMBOL_HEIGHT_RATIO = 0.66;

async function trimLogoBuffer(buf) {
  return sharp(buf).trim({ threshold: 10 }).png().toBuffer();
}

/**
 * @param {string} [root]
 * @param {{ variant?: 'symbol' | 'full' }} [opts] — `symbol` (predef.) legível no telemóvel; `full` com texto.
 */
export async function loadBrandIconPngBuffer(root = process.cwd(), opts = {}) {
  const variant = opts.variant ?? "symbol";
  const src = await resolveBrandIconSourcePath(root);
  const isReady = src.endsWith(APP_ICON_READY);
  const isOfficial = src.endsWith(OFFICIAL_ICON);

  let buf;

  if (isReady) {
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    removeNearWhiteRgba(data);
    return trimLogoBuffer(
      await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 },
      })
        .png()
        .toBuffer(),
    );
  }

  if (isOfficial) {
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    removeNearWhiteRgba(data);
    buf = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();
    buf = await trimLogoBuffer(buf);

    if (variant === "symbol") {
      const meta = await sharp(buf).metadata();
      const cropH = Math.min(meta.height ?? 0, Math.round((meta.height ?? 0) * OFFICIAL_SYMBOL_HEIGHT_RATIO));
      if (cropH > 0 && (meta.width ?? 0) > 0) {
        buf = await sharp(buf)
          .extract({ left: 0, top: 0, width: meta.width, height: cropH })
          .png()
          .toBuffer();
        buf = await trimLogoBuffer(buf);
      }
    }
    return buf;
  }

  buf = await sharp(await fs.readFile(src))
    .trim({ threshold: 15 })
    .png()
    .toBuffer();

  if (variant === "symbol" && src.includes("emblem")) {
    return buf;
  }

  return buf;
}
