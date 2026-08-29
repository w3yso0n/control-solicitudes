import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["postgres"],
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
