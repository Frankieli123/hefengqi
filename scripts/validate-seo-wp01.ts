/** Explicit local URLs only; at most twelve pages, no link crawling or writes. */
import { readdir } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { validateSeoHtml, validateSitemapXml } from "../src/lib/seo-validation";

async function main() {
  const [base, canonicalOrigin, ...args] = process.argv.slice(2);
  // Optional JSON map: {"/en/products":{"en":"https://ricewind.com/en/products", ...}}.
  const expectationArg = args.find((arg) => arg.startsWith("--hreflang="));
  const expectations: Record<string, Record<string, string>> = expectationArg ? JSON.parse(expectationArg.slice("--hreflang=".length)) : {};
  const paths = args.filter((arg) => !arg.startsWith("--hreflang="));
  const publicRoot = resolve("public");
  const assets = await readdir(publicRoot, { recursive: true, withFileTypes: true });
  const staticAssetPaths = assets.filter((entry) => entry.isFile()).map((entry) => `/${relative(publicRoot, resolve(entry.parentPath, entry.name)).split(sep).join("/")}`);
  if (!base || !canonicalOrigin || !paths.length || paths.length > 12) throw new Error("Usage: pnpm exec tsx scripts/validate-seo-wp01.ts http://127.0.0.1:PORT https://ricewind.com /en /en/products (max 12 paths)");
  const target = new URL(base);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(target.hostname)) throw new Error("Only an isolated loopback server is allowed");
  let failed = false;
  for (const path of paths) {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /\/(api|admin)(\/|$)/.test(path)) throw new Error("Only public paths allowed");
    const url = new URL(path, target);
    if (url.origin !== target.origin) throw new Error("Origin mismatch");
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30000) });
    const html = await response.text();
    const errors = response.status === 200
      ? path.endsWith("sitemap.xml") ? validateSitemapXml(html, canonicalOrigin) : validateSeoHtml(html, `${canonicalOrigin.replace(/\/+$/, "")}${path}`, { expectedHreflang: expectations[path], staticAssetPaths })
      : [`HTTP ${response.status}; location=${response.headers.get("location") ?? ""}`];
    console.log(JSON.stringify({ path, scope: "syntax-and-explicit-expectations", hreflangExpectationProvided: expectations[path] !== undefined, liveReciprocalChecked: false, publicationChecked: false, errors }));
    failed ||= errors.length > 0;
  }
  if (failed) process.exitCode = 1;
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
