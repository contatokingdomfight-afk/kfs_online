import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getThemeFromCookies, getLocaleFromCookies } from "@/lib/theme-locale-server";
import { ThemeLocaleSwitcherFixedOnlyOnPublic } from "@/components/ThemeLocaleSwitcherFixedOnlyOnPublic";
import { VercelMetrics } from "@/components/VercelMetrics";
import { PwaDisplayMode } from "@/components/PwaDisplayMode";
import { PwaServiceWorkerRegister } from "@/components/PwaServiceWorkerRegister";
import { PwaInstallProvider } from "@/components/PwaInstallProvider";
import { PwaInstallHint } from "@/components/PwaInstallHint";
import { AuthSessionKeepAlive } from "@/components/AuthSessionKeepAlive";
import { CapacitorNativeBridge } from "@/components/CapacitorNativeBridge";
import { PwaLaunchSplash } from "@/components/PwaLaunchSplash";
import { BRAND_BG, BRAND_LOGO, BRAND_LOGO_EMBLEM } from "@/lib/brand";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kingdom Fight School",
  description: "Plataforma de gestão e ensino da Kingdom Fight School",
  applicationName: "Kingdom Fight School",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Kingdom Fight School",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/kfs-emblem-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/kfs-emblem-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/kfs-emblem-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: BRAND_BG },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getThemeFromCookies();
  const locale = await getLocaleFromCookies();
  const appLocale = locale === "en" ? "en" : "pt";

  return (
    <html lang={locale} data-theme={theme} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content={BRAND_BG} />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/kfs-emblem-180.png" />
        <link rel="preload" href={BRAND_LOGO_EMBLEM} as="image" type="image/png" />
        <link rel="preload" href={BRAND_LOGO} as="image" type="image/png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||window.navigator.standalone; if(s)document.documentElement.style.backgroundColor='${BRAND_BG}';}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <PwaLaunchSplash />
        <PwaInstallProvider locale={appLocale}>
          <AuthSessionKeepAlive />
          <CapacitorNativeBridge />
          <PwaDisplayMode />
          <PwaServiceWorkerRegister />
          <PwaInstallHint />
          <ThemeLocaleSwitcherFixedOnlyOnPublic initialTheme={theme} initialLocale={locale} />
          {children}
          <VercelMetrics />
        </PwaInstallProvider>
      </body>
    </html>
  );
}
