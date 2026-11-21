export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const { warmProductionRoutes } = await import("@/lib/startup-warmup");
    void warmProductionRoutes();
  }
}
