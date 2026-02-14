import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Kingdom Fight School",
  description: "Plataforma de gestão e ensino da Kingdom Fight School",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="pt" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
