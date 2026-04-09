/**
 * Variante de ajuda à instalação quando não existe `beforeinstallprompt` (Safari, Firefox, etc.).
 */
export type PwaInstallHelpVariant = "ios" | "macos_safari" | "generic";

export function getPwaInstallHelpVariant(): PwaInstallHelpVariant {
  if (typeof window === "undefined") return "generic";
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";

  const isMac = /Macintosh/.test(ua);
  const isSafari =
    isMac &&
    /Safari/i.test(ua) &&
    !/Chrome|Chromium|Edg|OPR|CriOS|FxiOS/i.test(ua) &&
    (navigator.vendor?.includes("Apple") ?? false);
  if (isSafari) return "macos_safari";

  return "generic";
}
