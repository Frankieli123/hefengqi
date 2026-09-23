import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const isDevelopment = process.env.NODE_ENV === "development";
const requestedDistDir = process.env.NEXT_DIST_DIR?.trim();
const distDir = requestedDistDir && /^[A-Za-z0-9_-]+$/.test(requestedDistDir) ? requestedDistDir : ".next";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir,
  allowedDevOrigins: ["127.0.0.1", "192.168.31.50", "hefengqi.nasl.cc", "ls.nasl.cc", "ricewind.com", "192.168.31.1"],
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 92],
    minimumCacheTTL: 31_536_000,
    remotePatterns: [],
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    optimizePackageImports: ["framer-motion"],
    ...(isDevelopment ? { serverActions: { allowedOrigins: ["hefengqi.nasl.cc:8888"] } } : {}),
  },
  async rewrites() {
    return [
      {
        source: "/u/:path*",
        destination: "http://127.0.0.1:3008/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:locale/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, s-maxage=600, stale-while-revalidate=86400" }]
      },
      {
        source: "/:locale",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, s-maxage=600, stale-while-revalidate=86400" }]
      },
      ...(!isDevelopment ? [{
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      }] : []),
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; worker-src 'self' blob:; manifest-src 'self'` }
        ]
      },
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      }
    ];
  }
};

export default withNextIntl(nextConfig);
