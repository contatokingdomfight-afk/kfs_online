import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getThemeFromCookies, getLocaleFromCookies } from "@/lib/theme-locale-server";
import { ThemeLocaleSwitcherFixedOnlyOnPublic } from "@/components/ThemeLocaleSwitcherFixedOnlyOnPublic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Kingdom Fight School",
  description: "Plataforma de gestão e ensino da Kingdom Fight School",
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

  return (
    <html lang={locale} data-theme={theme} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeLocaleSwitcherFixedOnlyOnPublic initialTheme={theme} initialLocale={locale} />
        {children}
      </body>
    </html>
  );
}
