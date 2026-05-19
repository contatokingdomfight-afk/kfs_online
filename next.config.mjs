import bundleAnalyzer from "@next/bundle-analyzer";

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

export default withBundleAnalyzer(nextConfig);
