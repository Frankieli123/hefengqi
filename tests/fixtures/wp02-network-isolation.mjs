import { strict as assert } from "node:assert";

assert.equal(process.env.WP02_BROWSER_E2E, "1", "Test-only network isolation requires opt-in");
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (url.href === "http://127.0.0.1:3008/api/send") {
    throw new Error("WP02 isolated upstream unavailable; no network connection attempted");
  }
  if (url.origin !== "http://127.0.0.1:3108") {
    throw new Error("WP02 blocked external fetch");
  }
  return originalFetch(input, init);
};
