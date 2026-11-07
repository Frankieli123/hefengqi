import { env } from "@/lib/env";

/** Shared base for canonical URLs, schemas and crawler endpoints. */
export const siteUrl = env.SITE_URL.replace(/\/+$/, "");
