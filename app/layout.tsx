import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { THEME_LOCALE_BOOT_SCRIPT } from "@/lib/theme-locale";
import { ThemeLocaleSwitcherFixedOnlyOnPublic } from "@/components/ThemeLocaleSwitcherFixedOnlyOnPublic";
import { VercelMetrics } from "@/components/VercelMetrics";
import { PwaDisplayMode } from "@/components/PwaDisplayMode";
import { PwaServiceWorkerRegister } from "@/components/PwaServiceWorkerRegister";
import { PwaInstallProvider } from "@/components/PwaInstallProvider";
import { PwaInstallHint } from "@/components/PwaInstallHint";
import { AuthSessionKeepAlive } from "@/components/AuthSessionKeepAlive";
import { CapacitorNativeBridge } from "@/components/CapacitorNativeBridge";
import { PwaLaunchSplash } from "@/components/PwaLaunchSplash";
import { CookieBanner } from "@/components/CookieBanner";
import { MetaPixelScript } from "@/components/MetaPixelScript";
import { BRAND_BG, BRAND_ICON_BG } from "@/lib/brand";
import { getPublicOrigin } from "@/lib/site-public-url";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getPublicOrigin()),
  title: "Kingdom Fight School",
  description:
    "Escola de artes marciais em Algueirão-Mem Martins, Sintra: Muay Thai, Boxe e Kickboxing para adultos e crianças. Marca a tua aula experimental.",
  openGraph: {
    siteName: "Kingdom Fight School",
    locale: "pt_PT",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  applicationName: "Kingdom Fight School",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Kingdom Fight School",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/kfs-emblem-192.png?v=3", sizes: "192x192", type: "image/png" },
      { url: "/icons/kfs-emblem-512.png?v=3", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/kfs-emblem-180.png?v=3", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: BRAND_ICON_BG },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

/**
 * Sem leitura de cookies aqui: senão TODAS as páginas ficam dinâmicas (a home «/» chegou a ser ~75 % do CPU da Vercel).
 * Tema e língua são aplicados no browser por THEME_LOCALE_BOOT_SCRIPT, antes do 1.º paint.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_LOCALE_BOOT_SCRIPT }} />
        <meta name="theme-color" content={BRAND_ICON_BG} media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/kfs-emblem-180.png?v=3" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||window.navigator.standalone; if(s){document.documentElement.style.backgroundColor='${BRAND_ICON_BG}';document.body&&(document.body.style.backgroundColor='${BRAND_ICON_BG}');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <PwaLaunchSplash />
        <PwaInstallProvider>
          <AuthSessionKeepAlive />
          <CapacitorNativeBridge />
          <PwaDisplayMode />
          <PwaServiceWorkerRegister />
          <PwaInstallHint />
          <ThemeLocaleSwitcherFixedOnlyOnPublic />
          {children}
          <CookieBanner />
          <MetaPixelScript />
          <VercelMetrics />
        </PwaInstallProvider>
      </body>
    </html>
  );
}
