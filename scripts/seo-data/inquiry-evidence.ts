import { z } from "zod";
import { sanitizeSourceDomain } from "../../src/lib/inquiry-attribution";

const iso = z.iso.datetime();
const domain = z.string().max(253).refine((value) => sanitizeSourceDomain(`https://${value}`) === value);
const inputSchema = z.object({
  range: z.object({ start: iso, end: iso }).strict().refine(({ start, end }) => Date.parse(start) < Date.parse(end)),
  coverage: z.enum(["complete", "partial"]),
  evidenceKind: z.enum(["fixture", "operator_snapshot"]),
  rows: z.array(z.object({ key: z.string().regex(/^[a-f0-9]{64}$/), createdAt: iso, status: z.enum(["NEW", "PROCESSING", "CLOSED", "SPAM"]), sessionCandidate: z.literal(true).nullable(), referrerDomain: domain.nullable() }).strict()).max(100_000),
}).strict();
export type InquiryEvidenceInput = z.infer<typeof inputSchema>;
export function summarizeInquiries(raw: unknown) {
  const input = inputSchema.parse(raw);
  const keys = new Set<string>();
  for (const row of input.rows) {
    if (keys.has(row.key)) throw new Error("DUPLICATE_INQUIRY_SNAPSHOT");
    keys.add(row.key);
    if (Date.parse(row.createdAt) < Date.parse(input.range.start) || Date.parse(row.createdAt) >= Date.parse(input.range.end)) throw new Error("ROW_OUTSIDE_RANGE");
  }
  const statusCounts = { NEW: 0, PROCESSING: 0, CLOSED: 0, SPAM: 0 };
  for (const row of input.rows) statusCounts[row.status] += 1;
  const sourceReported = input.rows.filter((row) => row.referrerDomain !== null).length;
  const candidates = input.rows.filter((row) => row.sessionCandidate === true).length;
  const complete = input.coverage === "complete";
  const supportedCount = (count: number) => complete || count > 0 ? count : null;
  return {
    range: input.range, boundary: "UTC [start,end)", evidenceKind: input.evidenceKind, coverage: input.coverage, countsScope: "supplied_snapshot_only",
    total: complete ? input.rows.length : null, observedRows: input.rows.length,
    statusCounts: { NEW: supportedCount(statusCounts.NEW), PROCESSING: supportedCount(statusCounts.PROCESSING), CLOSED: supportedCount(statusCounts.CLOSED), SPAM: supportedCount(statusCounts.SPAM) },
    sourceReported: supportedCount(sourceReported), sourceUnknown: supportedCount(input.rows.length - sourceReported),
    sessionCandidates: supportedCount(candidates), pageViewMatches: null,
    qualified: null, sourceClosure: "unsupported", conversionRate: null, researchReady: false,
  } as const;
}
