const startupWarmupPaths = ["/en", "/zh", "/en/products"] as const;
const startupWarmupHost = "127.0.0.1";
const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

/** Initialize production route modules and data access without warming public HTML caches. */
export async function warmProductionRoutes() {
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return;
  // Next registers instrumentation before the standalone listener is bound.
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await fetch(`http://${startupWarmupHost}:${port}/api/health/live`, { signal: AbortSignal.timeout(1_000) });
      await response.arrayBuffer();
      if (response.ok) {
        console.info("startup_listener_ready", { milliseconds: Date.now() - startedAt });
        break;
      }
    } catch {
      // Next binds the listener before its application handler is initialized.
    }
    await delay(200);
  }
  const warmed: string[] = [];
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
      warmed.push(path);
    } catch (error) {
      console.warn("startup_warmup_failed", { path, error: error instanceof Error ? error.message : "unknown" });
    }
  }
  console.info("startup_warmup_complete", { paths: warmed });
}
