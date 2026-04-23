/**
 * Indica se a app corre como PWA em janela própria (manifest `standalone` ou `fullscreen`, ou iOS «Add to Home»).
 */
export function isPwaInstalledWindow(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}
