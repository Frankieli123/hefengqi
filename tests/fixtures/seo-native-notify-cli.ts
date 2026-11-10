import { nativeNotifyCli } from "../../scripts/seo-data/native-notify";

const behavior = process.argv[2];
globalThis.fetch = async () => { throw new Error("REAL_FETCH_FORBIDDEN"); };
const fetcher: typeof fetch = async (_url, init) => {
  if (behavior === "duplicate") throw new Error("DUPLICATE_MUST_BE_OFFLINE");
  if (init?.redirect !== "error") throw new Error("REDIRECT_FORBIDDEN");
  if (!init.headers || !("Authorization" in init.headers)) return Response.json({ code: 0, tenant_access_token: "token-secret" });
  if (behavior === "failure") return Response.json({ code: 230001, msg: "response-secret credential-secret token-secret" });
  return Response.json({ code: 0, data: { message_id: "om_fixture", chat_id: "oc_target" } });
};
void nativeNotifyCli(process.argv.slice(3), {
  environment: { FEISHU_APP_ID: "cli_fake", FEISHU_APP_SECRET: "credential-secret" }, fetcher,
  resolveHost: async () => ["93.184.216.34"], now: () => new Date("2026-11-10T11:00:00.000Z"),
}).then((result) => { process.stdout.write(`${result.text}\n`); process.exitCode = result.code; });
