import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = env.SITE_URL;
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/*/search", "/*/products/compare", "/*?*compare=", "/*?*q="] },
      { userAgent: ["GPTBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "anthropic-ai", "Google-Extended", "bingbot", "Googlebot", "Baiduspider", "YandexBot"], allow: "/", disallow: ["/admin", "/api"] },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/image-sitemap.xml`],
    host: siteUrl,
  };
}
