import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/lambda-benchmark',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
