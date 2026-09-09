import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const siteUrl = env.SITE_URL;
export function GET() {
  return new Response(`# HEFENGQI

> HEFENGQI is a communications and energy equipment distributor and solution integration service for B2B integrators and procurement teams. Product prices are not public; confirmed specifications and quotations are provided through inquiry.

## Core pages

- [English company overview](${siteUrl}/en/about)
- [English product catalog](${siteUrl}/en/products)
- [English solutions](${siteUrl}/en/solutions)
- [English case studies](${siteUrl}/en/cases)
- [English contact and inquiry](${siteUrl}/en/contact)
- [中文产品中心](${siteUrl}/zh/products)
- [Русский каталог](${siteUrl}/ru/products)

## Content policy

- Product models, units, certifications, availability, and prices are never inferred.
- Public product pages use verified structured data and authorized media.
- Missing specifications are shown as unavailable, not guessed.
- No public pricing or public document download center is provided.
`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
