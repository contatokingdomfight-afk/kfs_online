import anatomicalBackImport from "./anatomical-illustration/back.svg?url";
import anatomicalFrontImport from "./anatomical-illustration/front.svg?url";

/**
 * O Next empacota SVG como recurso estático: o default export pode ser `string` ou `{ src: string }`.
 * Usar o objeto inteiro em `<img src>` vira `[object Object]` e o browser pede `/dashboard/[object Object]`.
 */
function bundledSvgUrl(mod: unknown): string {
  if (typeof mod === "string") return mod;
  if (mod && typeof mod === "object" && "src" in mod) {
    const src = (mod as { src?: unknown }).src;
    if (typeof src === "string") return src;
  }
  throw new Error("Ilustração anatómica: import SVG inválido (esperada string ou { src }).");
}

/** URL absoluta por caminho (`/_next/static/media/...`). */
export const ANATOMICAL_ILLUSTRATION_FRONT_SRC = bundledSvgUrl(anatomicalFrontImport);
export const ANATOMICAL_ILLUSTRATION_BACK_SRC = bundledSvgUrl(anatomicalBackImport);
