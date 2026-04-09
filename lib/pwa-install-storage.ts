/** Preferência: aviso inicial fechado → entrada «Instalar app» só no menu lateral */
export const PWA_SIDEBAR_MODE_KEY = "kfs-pwa-sidebar-mode";

/** Legado: dismiss antigo (14 dias); migrado para menu lateral */
export const PWA_LEGACY_DISMISS_KEY = "kfs-pwa-install-dismissed";

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
