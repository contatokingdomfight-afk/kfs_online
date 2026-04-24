import path from "node:path";
import { fileURLToPath } from "node:url";

import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Three / R3F em ESM; evita duplicar React nos chunks dinâmicos (erro ReactCurrentBatchConfig). */
  transpilePackages: ["three", "@react-three/fiber"],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      const react = path.resolve(__dirname, "node_modules/react");
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        react,
        "react/jsx-runtime": path.resolve(react, "jsx-runtime.js"),
        "react/jsx-dev-runtime": path.resolve(react, "jsx-dev-runtime.js"),
      };
    }
    return config;
  },

  /** Pedidos legados a /favicon.ico passam a servir o ícone gerado em app/icon.tsx */
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon" }];
  },
};

export default withBundleAnalyzer(nextConfig);
