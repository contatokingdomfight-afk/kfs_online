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

/** Fundo unificado nos ícones (preto puro ≈ ecrã inicial iOS/Android). */
export const ICON_BG_RGBA = { r: 0, g: 0, b: 0, alpha: 255 };

function colorDistance(r, g, b, tr, tg, tb) {
  const dr = r - tr;
  const dg = g - tg;
  const db = b - tb;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Amostra cantos e uniformiza o fundo escuro/texturado (evita «caixa» chumbo + margem). */
function flattenDarkBackgroundRgba(data, width, height, target) {
  const patch = Math.min(12, Math.floor(width / 8), Math.floor(height / 8));
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;

  const corners = [
    [0, 0],
    [width - patch, 0],
    [0, height - patch],
    [width - patch, height - patch],
  ];

  for (const [x0, y0] of corners) {
    for (let y = y0; y < y0 + patch; y++) {
      for (let x = x0; x < x0 + patch; x++) {
        const i = (y * width + x) * 4;
        sr += data[i];
        sg += data[i + 1];
        sb += data[i + 2];
        n++;
      }
    }
  }

  const refR = Math.round(sr / n);
  const refG = Math.round(sg / n);
  const refB = Math.round(sb / n);
  const hard = 52;
  const soft = 36;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = (r + g + b) / 3;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);

    if (lum > 145 || (sat > 42 && lum > 55)) continue;

    const d = colorDistance(r, g, b, refR, refG, refB);
    if (d < hard) {
      data[i] = target.r;
      data[i + 1] = target.g;
      data[i + 2] = target.b;
      data[i + 3] = target.alpha;
    } else if (d < hard + soft) {
      const t = (d - hard) / soft;
      data[i] = Math.round(target.r * (1 - t) + r * t);
      data[i + 1] = Math.round(target.g * (1 - t) + g * t);
      data[i + 2] = Math.round(target.b * (1 - t) + b * t);
    }
  }
}

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
    flattenDarkBackgroundRgba(data, info.width, info.height, ICON_BG_RGBA);
    return sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();
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
