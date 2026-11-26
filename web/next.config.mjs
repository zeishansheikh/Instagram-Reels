import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    return config;
  },
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico|static).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const backend = process.env.BACKEND_URL || "http://127.0.0.1:8001";
    return [
      {
        source: "/settings-api/:path*",
        destination: `${backend}/settings/:path*`,
      },
      {
        source: "/static/:path*",
        destination: `${backend}/static/:path*`,
      },
      {
        source: "/d3/:path*",
        destination: `${backend}/d3/:path*`,
      },
      {
        source: "/reels/:path*",
        destination: `${backend}/reels/:path*`,
      },
      {
        source: "/jobs/:path*",
        destination: `${backend}/jobs/:path*`,
      },
      {
        source: "/health",
        destination: `${backend}/health`,
      },
    ];
  },
};

export default nextConfig;
