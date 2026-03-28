import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['dockerode', '@composio/core', 'pg'],
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
