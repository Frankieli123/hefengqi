import { cli } from "../../scripts/seo-data/cli";

async function main() {
  const output = process.argv[2];
  if (!output) throw new Error("离线 fixture 需要显式私有输出目录");
  const fetcher: typeof fetch = async (url, init) => {
    if (!String(url).startsWith("https://www.googleapis.com/webmasters/v3/sites/")) throw new Error("fixture 禁止页面请求");
    const body = JSON.parse(String(init?.body));
    const first = body.startDate === "2026-03-07";
    return new Response(JSON.stringify({ rows: [{ keys: ["https://fixture.example/offline", "offline-fixture-query"], clicks: first ? 2 : 3, impressions: first ? 10 : 30, ctr: first ? 0.2 : 0.1, position: first ? 3 : 7 }] }));
  };
  const result = await cli(["--source", "gsc", "--start", "2026-03-07", "--end", "2026-03-08", "--dimensions", "page,query", "--output", output, "--gsc-research", ...process.argv.slice(3)], { GSC_SITE_URL: "sc-domain:fixture.example", GSC_ACCESS_TOKEN: "offline-fixture-token" }, fetcher, new Date("2026-11-07T12:00:00Z"));
  process.stdout.write(`${result.text}\n`);
  process.exitCode = result.code;
}

void main().catch(() => { process.stderr.write("离线 fixture 失败，详情已隐去。\n"); process.exitCode = 1; });
