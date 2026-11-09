import { runnerCli } from "../../scripts/seo-data/runner";

const fixtureFetch: typeof fetch = async (input, init) => {
  if (typeof input !== "string" || !input.startsWith("https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Afixture.example/searchAnalytics/query") || init?.method !== "POST") throw new Error("FIXTURE_REQUEST_REJECTED");
  const request = JSON.parse(String(init.body));
  return new Response(JSON.stringify({ rows: [{ keys: request.dimensions.map((dimension: string) => dimension === "date" ? request.startDate : dimension === "page" ? "https://fixture.example/offline" : dimension === "query" ? "offline-fixture-query" : dimension === "country" ? "USA" : "DESKTOP"), clicks: 2, impressions: 10, ctr: 0.2, position: 3 }] }), { headers: { "content-type": "application/json" } });
};

void runnerCli(process.argv.slice(2), { GSC_SITE_URL: "sc-domain:fixture.example", GSC_ACCESS_TOKEN: "offline-fixture-secret" }, fixtureFetch, new Date("2026-11-09T12:00:00Z")).then((result) => { process.stdout.write(`${result.text}\n`); process.exitCode = result.code; }).catch(() => { process.stderr.write("FIXTURE_FAILED_DETAILS_REDACTED\n"); process.exitCode = 1; });
