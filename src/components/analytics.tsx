import Script from "next/script";
import { env } from "@/lib/env";

export function Analytics() {
  const websiteId = env.UMAMI_WEBSITE_ID;
  const src = env.UMAMI_SCRIPT_URL;
  if (!websiteId || !src) return null;

  return (
    <Script
      src={src}
      data-website-id={websiteId}
      data-host-url="/u"
      data-domains="ricewind.com,hefengqi.nasl.cc"
      data-do-not-track="true"
      data-exclude-search="true"
      strategy="afterInteractive"
    />
  );
}
