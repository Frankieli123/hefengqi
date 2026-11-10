import { deliveryCli } from "../../scripts/seo-data/delivery";

const behavior = process.argv[2];
const fetcher: typeof fetch = async (_input, init) => {
  if (behavior === "hang") return new Promise<Response>(() => {});
  const payload = JSON.parse(String(init?.body));
  if (payload.mode !== "delivery_test_not_production_alert" || init?.redirect !== "error") throw new Error("FIXTURE_REJECTED");
  return new Response(null, { status: 204 });
};
void deliveryCli(process.argv.slice(3), { environment: { TEST_WEBHOOK: "https://hooks.example.org/private-hook", TEST_TOKEN: "offline-secret" }, fetcher }).then((result) => {
  process.stdout.write(`${result.text}\n`);
  process.exitCode = result.code;
});
