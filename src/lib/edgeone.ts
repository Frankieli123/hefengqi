import "server-only";
import { env } from "@/lib/env";

export async function purgeEdgeOne(urls: string[]) {
  if (!env.EDGEONE_PURGE_ENDPOINT || !env.EDGEONE_API_TOKEN || !urls.length) return;
  const response = await fetch(env.EDGEONE_PURGE_ENDPOINT, { method: "POST", headers: { Authorization: `Bearer ${env.EDGEONE_API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ urls }), cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`EdgeOne purge failed: ${response.status}`);
}
