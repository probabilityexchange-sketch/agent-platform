import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["dockerode"],
  turbopack: {},
  webpack: (config) => {
    config.externals = config.externals || {};
    config.externals["@solana/kit"] = "commonjs @solana/kit";
    config.externals["@solana-program/memo"] = "commonjs @solana-program/memo";
    config.externals["@solana-program/system"] = "commonjs @solana-program/system";
    config.externals["@solana-program/token"] = "commonjs @solana-program/token";
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
