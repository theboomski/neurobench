import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Ensure blog routes take priority over [category]/[id]
      {
        source: "/blog/:slug",
        destination: "/blog/:slug",
      },
    ];
  },
};

export default nextConfig;
