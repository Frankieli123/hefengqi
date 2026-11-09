import { runnerCli } from "../../scripts/seo-data/runner";

const paused: typeof fetch = async () => {
  process.stdout.write("FIXTURE_WAITING\n");
  await new Promise((resolve) => setTimeout(resolve, 60000));
  throw new Error("FIXTURE_EXPIRED");
};
void runnerCli(process.argv.slice(2), { GSC_SITE_URL: "sc-domain:fixture.example", GSC_ACCESS_TOKEN: "offline-fixture-secret" }, paused, new Date("2026-11-09T12:00:00Z")).then((result) => { process.stdout.write(`${result.text}\n`); process.exitCode = result.code; });
