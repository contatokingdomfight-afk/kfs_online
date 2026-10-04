"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useHasAnalyticsConsent } from "@/lib/cookie-consent";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

declare global {
  interface Window {
    fbq?: (action: string, event: string, opts?: Record<string, unknown>) => void;
  }
}

/**
 * Meta Pixel base (PageView), carregado sitewide no layout raiz — só depois de o
 * utilizador aceitar cookies no banner ("Aceitar todos"). Antes disso, `window.fbq`
 * nunca existe, por isso qualquer `fbq('track', ...)` disparado noutro componente
 * (ex.: formulário de lista de espera / aula experimental) é inofensivo (no-op).
 *
 * Também dispara um `PageView` extra a cada navegação client-side (App Router não
 * remonta o layout raiz), para o funil home → aula-experimental ficar rastreável.
 */
export function MetaPixelScript() {
  const hasConsent = useHasAnalyticsConsent();
  const pathname = usePathname();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      // A primeira PageView já é disparada pelo script inline abaixo.
      firstRender.current = false;
      return;
    }
    if (hasConsent && typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname, hasConsent]);

  if (!PIXEL_ID || !hasConsent) return null;

  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `,
      }}
    />
  );
}
