"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/theme-locale";
import { shouldCapturePwaInstallPrompt } from "@/lib/pwa-install-ui";
import {
  migrateLegacyPwaDismiss,
  readPreferSidebar,
  recordAppInstalledAt,
  writePreferSidebar,
} from "@/lib/pwa-install-storage";

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaInstallContextValue = {
  locale: Locale;
  /** localStorage já lido (evita flash do banner) */
  storageReady: boolean;
  /** Evento Chromium (pode ser null até o browser disparar) */
  deferredPrompt: InstallPromptEvent | null;
  setDeferredPrompt: (e: InstallPromptEvent | null) => void;
  /** Utilizador escolheu «Agora não» / fechar o aviso inicial → só menu lateral */
  preferSidebar: boolean;
  /** Marca preferência e esconde o banner inicial */
  moveInstallToSidebar: () => void;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function usePwaInstall() {
  const ctx = useContext(PwaInstallContext);
  return ctx;
}

export function PwaInstallProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [preferSidebar, setPreferSidebar] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    migrateLegacyPwaDismiss();
    setPreferSidebar(readPreferSidebar());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    /**
     * Capturar o evento suprime o mini-infobar nativo; o install real faz-se com `prompt()` no menu
     * (ex.: `SidebarPwaInstall`). Só capturamos em mobile fora do backoffice — no admin/desktop
     * deixamos o browser decidir (evita aviso «Banner not shown» no DevTools).
     */
    const onBip = (e: Event) => {
      if (!shouldCapturePwaInstallPrompt(pathname)) return;
      e.preventDefault();
      setDeferredPrompt(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [pathname]);

  /** Só existe evento de instalação concluída; não há API para «removeu do ecrã principal». */
  useEffect(() => {
    const onInstalled = () => recordAppInstalledAt();
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  const moveInstallToSidebar = useCallback(() => {
    writePreferSidebar();
    setPreferSidebar(true);
    /* Não limpar deferredPrompt: o Chromium só emite um evento; o menu lateral usa o mesmo. */
  }, []);

  const value = useMemo(
    () => ({
      locale,
      deferredPrompt,
      setDeferredPrompt,
      preferSidebar,
      moveInstallToSidebar,
    }),
    [locale, deferredPrompt, preferSidebar, moveInstallToSidebar]
  );

  /* Evita mismatch de hidratação: até ler storage, não forçar filhos que dependem de preferSidebar */
  const fullValue = useMemo(
    () => ({
      ...value,
      storageReady,
    }),
    [value, storageReady]
  );

  if (!storageReady) {
    return (
      <PwaInstallContext.Provider
        value={{
          locale,
          storageReady: false,
          deferredPrompt: null,
          setDeferredPrompt,
          preferSidebar: false,
          moveInstallToSidebar,
        }}
      >
        {children}
      </PwaInstallContext.Provider>
    );
  }

  return <PwaInstallContext.Provider value={fullValue}>{children}</PwaInstallContext.Provider>;
}
