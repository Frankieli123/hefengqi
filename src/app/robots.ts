import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = env.SITE_URL;
  const disallow = ["/admin", "/api", "/*/search", "/*/products/compare", "/*?*compare=", "/*?*q="];
  return {
    // Preserve the existing allow policy. Specific groups do not inherit '*'.
    // Search/retrieval and training controls are separate, with identical scope restrictions.
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: ["ChatGPT-User", "PerplexityBot", "bingbot", "Googlebot", "Baiduspider", "YandexBot"], allow: "/", disallow },
      { userAgent: ["GPTBot", "ClaudeBot", "anthropic-ai", "Google-Extended"], allow: "/", disallow },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/image-sitemap.xml`],
    host: siteUrl,
  };
}
