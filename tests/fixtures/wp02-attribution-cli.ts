import { strict as assert } from "node:assert";
import { summarizeInquiries } from "../../scripts/seo-data/inquiry-evidence";
import { planCli } from "../../scripts/seo-data/schedule-plan";

function main(args: string[]) {
  if (args.length === 1 && args[0] === "--help") {
    process.stdout.write("离线内置匿名 fixture 验证（非 live）：--dry-run。无输入文件/环境/凭据/数据库/网络/输出文件。\n");
    return;
  }
  assert.deepEqual(args, ["--dry-run"], "必须先 --help，验证时显式 --dry-run");
  const summary = summarizeInquiries({ range: { start: "2026-11-01T00:00:00Z", end: "2026-11-08T00:00:00Z" }, evidenceKind: "fixture", coverage: "complete", rows: [
    { key: "a".repeat(64), createdAt: "2026-11-01T00:00:00Z", status: "CLOSED", sessionCandidate: null, referrerDomain: null },
    { key: "b".repeat(64), createdAt: "2026-11-02T00:00:00Z", status: "NEW", sessionCandidate: true, referrerDomain: "search.example" },
  ] });
  assert.equal(summary.total, 2);
  assert.equal(summary.sourceUnknown, 1);
  assert.equal(summary.qualified, null);
  assert.equal(summary.pageViewMatches, null);
  const plans = ["gsc", "umami"].map((source) => {
    const result = planCli(["--dry-run", "--now", "2026-11-08T12:00:00Z", "--start", "2026-11-01", "--end", "2026-11-07", "--source", source, "--review-start", "2026-11-01", "--review-end", "2026-11-07", "--coverage", "partial"]);
    assert.equal(result.code, 0);
    const plan = JSON.parse(result.text);
    assert.equal(plan.executed, false);
    assert.equal(plan.configuration, "missing");
    return plan;
  });
  process.stdout.write(`${JSON.stringify({ fixtureValidation: "passed", liveValidated: false, researchReady: false, summary, plans }, null, 2)}\n`);
}
try { main(process.argv.slice(2)); } catch { process.stderr.write("离线 fixture 验证失败；详情不输出。\n"); process.exitCode = 1; }
