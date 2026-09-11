import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["postgres"],
  experimental: {
    proxyClientMaxBodySize: "52mb",
  },
  async redirects() {
    return [
      { source: "/cuantiva", destination: "/bandeja", permanent: false },
      {
        source: "/cuantiva/:path*",
        destination: "/bandeja/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
