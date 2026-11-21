const startupWarmupPaths = ["/en", "/zh", "/en/products"] as const;
const startupWarmupHost = "127.0.0.1";

/** Initialize production route modules and data access without warming public HTML caches. */
export async function warmProductionRoutes() {
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return;
  for (const path of startupWarmupPaths) {
    try {
      const response = await fetch(`http://${startupWarmupHost}:${port}${path}`, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "text/html", "User-Agent": "RICEWIND-Startup-Warmup/1" },
        signal: AbortSignal.timeout(30_000),
      });
      await response.arrayBuffer();
      if (!response.ok) throw new Error(`Warmup ${path} returned ${response.status}`);
    } catch (error) {
      console.warn("startup_warmup_failed", { path, error: error instanceof Error ? error.message : "unknown" });
    }
  }
}
