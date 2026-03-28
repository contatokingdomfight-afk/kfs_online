/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["recharts"],
  },
  /** Pedidos legados a /favicon.ico passam a servir o ícone gerado em app/icon.tsx */
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon" }];
  },
};

export default nextConfig;
