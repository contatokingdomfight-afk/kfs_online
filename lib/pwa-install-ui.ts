/**
 * Variante de ajuda à instalação quando não existe `beforeinstallprompt` (Safari, Firefox, etc.).
 */
export type PwaInstallHelpVariant = "ios" | "macos_safari" | "generic";

/** Rotas onde não vale a pena suprimir o banner nativo de instalação PWA. */
const PWA_INSTALL_SKIP_PREFIXES = ["/admin", "/sign-in", "/sign-up", "/auth"];

/**
 * Só chamar `preventDefault()` no `beforeinstallprompt` nestas condições — evita aviso
 * do DevTools («Banner not shown…») no backoffice desktop sem perder o fluxo mobile do aluno.
 */
export function shouldCapturePwaInstallPrompt(pathname: string): boolean {
  if (typeof window === "undefined") return false;
  if (PWA_INSTALL_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  if (!window.matchMedia("(max-width: 768px)").matches) return false;
  return true;
}

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
