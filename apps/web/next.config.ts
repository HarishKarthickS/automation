import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const destinationBase = process.env.INTERNAL_API_ORIGIN ?? "http://localhost:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${destinationBase}/api/:path*`
      }
    ];
  },
  experimental: {
    optimizePackageImports: ["@automation/shared"]
  }
};

export default nextConfig;

