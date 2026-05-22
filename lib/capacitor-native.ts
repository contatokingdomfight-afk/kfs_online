import { isPwaInstalledWindow } from "@/lib/pwa-installed-window";

type CapacitorWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
};

/** App nativa Capacitor (Android / iOS), não browser nem PWA instalada. */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as CapacitorWindow).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/** Já está em «modo app» (PWA instalada ou shell Capacitor) — ocultar CTAs de instalar. */
export function isNativeAppShell(): boolean {
  return isCapacitorNative() || isPwaInstalledWindow();
}
