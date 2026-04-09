/** Preferência: aviso inicial fechado → entrada «Instalar app» só no menu lateral */
export const PWA_SIDEBAR_MODE_KEY = "kfs-pwa-sidebar-mode";

/** Legado: dismiss antigo (14 dias); migrado para menu lateral */
export const PWA_LEGACY_DISMISS_KEY = "kfs-pwa-install-dismissed";

/** Último `appinstalled` (ms desde epoch); só indica que houve instalação bem-sucedida — não há evento de desinstalação na Web */
export const PWA_APPINSTALLED_AT_KEY = "kfs-pwa-appinstalled-at";

export function recordAppInstalledAt(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PWA_APPINSTALLED_AT_KEY, String(Date.now()));
  } catch {
    /* quota / modo privado */
  }
}

export function readAppInstalledAtMs(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PWA_APPINSTALLED_AT_KEY);
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function readPreferSidebar(): boolean {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(PWA_SIDEBAR_MODE_KEY) === "1") return true;
  return false;
}

export function writePreferSidebar(): void {
  window.localStorage.setItem(PWA_SIDEBAR_MODE_KEY, "1");
}

/** Migração única: quem tinha fechado o aviso antigo passa a ver a opção no menu */
export function migrateLegacyPwaDismiss(): void {
  if (typeof window === "undefined") return;
  const legacy = window.localStorage.getItem(PWA_LEGACY_DISMISS_KEY);
  if (legacy != null) {
    window.localStorage.setItem(PWA_SIDEBAR_MODE_KEY, "1");
    window.localStorage.removeItem(PWA_LEGACY_DISMISS_KEY);
  }
}
