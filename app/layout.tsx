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
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
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
      <body className={`${inter.variable} font-sans`}>
        <PwaInstallProvider locale={appLocale}>
          <AuthSessionKeepAlive />
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
