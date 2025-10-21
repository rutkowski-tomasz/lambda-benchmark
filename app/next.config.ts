import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'development' ? '' : '/lambda-benchmark',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
