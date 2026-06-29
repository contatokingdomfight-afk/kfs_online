import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Tribo: até 4 imagens × 3 MB no FormData da Server Action (o default do Next é 1 MB). */
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  /** Pedidos legados a /favicon.ico passam a servir o ícone gerado em app/icon.tsx */
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon" }];
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
  sourcemaps: {
    disable: process.env.NODE_ENV !== "production",
  },
});
