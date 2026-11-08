import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { exportResearch, summarizeResearch } from "./research";
import { canonical, researchPrivacy } from "./model";

const help = `离线 GSC 研究摘要（只读私有账本，不访问网络）
用法：node --import tsx scripts/seo-data/research-cli.ts
  --ledger-dir /tmp/private-research --scope SHA256 --source gsc
  --encoding sha256_page_query|raw_page_query_private --evidence-kind fixture|live_api
  --start YYYY-MM-DD --end YYYY-MM-DD [--export /tmp/private-research/report.json]
必须显式选择同一 scope、来源、encoding、时间及证据类型；scope 由 scopeKey(run) 计算。
默认 stdout 只输出 hash 与汇总，不输出可读 URL/查询。API 可见子集不等于属性总量。
CTR = 总点击/总曝光；position 按曝光加权。零曝光比率/位置为 null，不补零。
不同维度集合不合并；未覆盖日期拒绝，旧 last-good 可保留而非声称最新。
--export 是人工显式私有可读标签导出，仅同一账本目录新建 0600 JSON 文件；
拒绝 Git/公共/源码目录、符号链接、覆盖；成功仅返回状态，不打印可读标签。
原子 link 是发布点；private_report_created_cleanup_pending 表示已发布但本次临时文件需人工清理，不要重试覆盖。
${researchPrivacy}
researchCapable/local/mock 不等于 live 验证，更不等于整个 WP02 researchReady。
`;

export async function researchCli(args: string[]): Promise<{ code: number; text: string }> {
  try {
    const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: {
      help: { type: "boolean" }, "ledger-dir": { type: "string" }, scope: { type: "string" }, source: { type: "string" },
      encoding: { type: "string" }, "evidence-kind": { type: "string" }, start: { type: "string" }, end: { type: "string" }, export: { type: "string" },
    } });
    if (values.help) return { code: 0, text: help };
    if (!values["ledger-dir"]) throw new Error("EXPLICIT_LEDGER_REQUIRED");
    const selection = { scope: values.scope, source: values.source, encoding: values.encoding, evidenceKind: values["evidence-kind"], start: values.start, end: values.end };
    if (values.export !== undefined) {
      const result = await exportResearch(values["ledger-dir"], selection, values.export);
      return { code: 0, text: canonical({ ...result, labelsOnStdout: false }) };
    }
    return { code: 0, text: canonical(await summarizeResearch(values["ledger-dir"], selection)) };
  } catch { return { code: 1, text: "研究摘要失败：参数、账本、覆盖范围或私有输出被拒绝；详情已隐去。使用 --help。" }; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void researchCli(process.argv.slice(2)).then((result) => { process.stdout.write(`${result.text}\n`); process.exitCode = result.code; });
}
