import { describe, expect, it } from "vitest";
import { readAnonymousSession, sanitizeSubmissionPath, sanitizeSourceDomain, attributionFromRequest } from "../src/lib/inquiry-attribution";
import { summarizeInquiries } from "../scripts/seo-data/inquiry-evidence";
import { planCli } from "../scripts/seo-data/schedule-plan";
import { dayBounds } from "../scripts/seo-data/model";
import { referrerOrigin } from "../src/lib/inquiry-client-context";

const now = Date.parse("2026-11-08T12:00:00Z");
const id = "anonymous-session-123";
describe("WP02 request boundary", () => {
  it("accepts only canonical, active session cookies, never future or expired", () => {
    expect(readAnonymousSession(`${id}.${(now - 1).toString(36)}`, now)).toBe(id);
    for (const cookie of [undefined, id, `${id}.${now.toString(36)}.extra`, `${id}.!123`, `${id}.${(now + 1).toString(36)}`, `${id}.${(now - 1800000).toString(36)}`, `short.${now.toString(36)}`, `${id}.0${now.toString(36)}`]) {
      expect(readAnonymousSession(cookie, now)).toBeNull();
    }
  });
  it("allows only public paths, discards query/hash and rejects encoded/private paths", () => {
    expect(sanitizeSubmissionPath("https://ricewind.com/en/contact?email=secret#x")).toBe("/en/contact");
    for (const path of ["/admin", "/en/admin", "/en/%61dmin", "/en/%2561dmin", "/api/test", "/en/products/%2fadmin", "//evil.example/en", "https://evil.example/en", "/en/unknown", "/en/contact/secret", "/en/products/" + "a".repeat(600)]) expect(sanitizeSubmissionPath(path)).toBeNull();
  });
  it("keeps domain only; rejects userinfo, non-http, IP and localhost", () => {
    expect(sanitizeSourceDomain("https://Search.Example/path?q=secret")).toBe("search.example");
    for (const value of ["", "https://name:pass@example.com", "https://@example.com", "ftp://example.com", "http://127.0.0.1", "http://[::1]", "http://localhost", "http://x.localhost", "http://localhost.", "http://2130706433", "http://0x7f000001", "not a url"]) expect(sanitizeSourceDomain(value)).toBeNull();
  });
  it("does not even send the browser referrer path, query or hash", () => {
    expect(referrerOrigin("https://search.example/private?email=private#secret")).toBe("https://search.example");
    expect(referrerOrigin("https://user:secret@search.example/")).toBeUndefined();
    expect(referrerOrigin("https://@search.example/")).toBeUndefined();
    expect(referrerOrigin("ftp://search.example/")).toBeUndefined();
    expect(referrerOrigin("")).toBeUndefined();
    expect(sanitizeSourceDomain("https://arbitrary-unclassified.example/")).toBe("arbitrary-unclassified.example");
  });
  it("never accepts client sessionKey/qualification and leaves absence null", () => {
    const result = attributionFromRequest(undefined, { sessionKey: "forged", qualified: true, submissionPath: {}, referrer: 42 }, now, (value) => `hash:${value}`);
    expect(result).toEqual({ attributionSessionKey: null, attributionPath: null, attributionReferrerDomain: null });
    expect(attributionFromRequest(`${id}.${now.toString(36)}`, {}, now, (value) => `hash:${value}`).attributionSessionKey).toBe(`hash:analytics-session:${id}`);
  });
});

const range = { start: "2026-11-01T00:00:00Z", end: "2026-11-08T00:00:00Z" };
const row = { key: "a".repeat(64), createdAt: "2026-11-02T00:00:00Z", status: "CLOSED", sessionCandidate: null, referrerDomain: null };
describe("offline evidence", () => {
  it("keeps old records unknown, status separate, no unsupported sales conversion", () => {
    const result = summarizeInquiries({ range, coverage: "partial", evidenceKind: "fixture", rows: [row] });
    expect(result.statusCounts.CLOSED).toBe(1);
    expect(result.sourceUnknown).toBe(1);
    expect(result.sessionCandidates).toBeNull();
    expect(result.qualified).toBeNull();
    expect(result.sourceClosure).toBe("unsupported");
    expect(result.conversionRate).toBeNull();
    expect(result.researchReady).toBe(false);
    expect(summarizeInquiries({ range, coverage: "partial", evidenceKind: "fixture", rows: [] }).total).toBeNull();
  });
  it("rejects conflicts, credentials disguised as domains and nonminimal snapshots", () => {
    const snapshot = { range, coverage: "complete", evidenceKind: "fixture", rows: [row] };
    for (const rows of [[row, { ...row, status: "NEW" }], [{ ...row, qualified: true }], [{ ...row, sessionCandidate: "raw-session-id" }], [{ ...row, referrerDomain: "name@example.com" }], [{ ...row, referrerDomain: "search.example/path" }], [{ ...row, createdAt: range.end }], [{ ...row, createdAt: "2026-10-31T23:59:59Z" }]]) expect(() => summarizeInquiries({ ...snapshot, rows })).toThrow();
  });
  it("counts workflow states, never treats CLOSED as qualified", () => {
    const result = summarizeInquiries({ range, coverage: "complete", evidenceKind: "fixture", rows: ["NEW", "PROCESSING", "CLOSED", "SPAM"].map((status, index) => ({ ...row, key: String(index).repeat(64), status })) });
    expect(result.statusCounts).toEqual({ NEW: 1, PROCESSING: 1, CLOSED: 1, SPAM: 1 });
    expect(result.total).toBe(4);
    expect(result.qualified).toBeNull();
    expect(result.conversionRate).toBeNull();
    expect(result.sourceReported).toBe(0);
  });
  it("requires strict anonymous inputs and rejects duplicates/conflicts", () => {
    for (const input of [{ rows: [] }, { range, coverage: "complete", evidenceKind: "fixture", rows: [row, row] }, { range, coverage: "complete", evidenceKind: "fixture", rows: [{ ...row, email: "private@example.com" }] }, { range: { ...range, start: "2026-11-01" }, coverage: "complete", evidenceKind: "fixture", rows: [] }]) expect(() => summarizeInquiries(input)).toThrow();
    expect(summarizeInquiries({ range, coverage: "complete", evidenceKind: "fixture", rows: [{ ...row, createdAt: "2026-11-07T00:00:00Z" }] }).total).toBe(1);
  });
});

const args = ["--dry-run", "--now", "2026-11-08T12:00:00Z", "--start", "2026-11-01", "--end", "2026-11-07", "--source", "gsc", "--review-start", "2026-11-01", "--review-end", "2026-11-07"];
describe("pure schedule plan", () => {
  it("requires explicit dry-run/options and reports configuration/partial guards", () => {
    expect(planCli(["--help"]).code).toBe(0);
    expect(planCli(args.slice(1)).code).toBe(1);
    const result = planCli(args);
    expect(result.code).toBe(0);
    const plan = JSON.parse(result.text);
    expect(plan.executed).toBe(false);
    expect(plan.enabled).toBe(false);
    expect(plan.matureThrough).toBe("2026-11-05");
    expect(plan.days.find((day: { date: string }) => day.date === "2026-11-06").eligibility).toBe("maturity_pending");
    expect(plan.configuration).toBe("missing");
    expect(plan.partialPolicy).toBe("block_complete_claims_and_alert");
    expect(planCli([...args, "--configured"]).text).toContain('"recheckOn": "2026-11-13"');
  });
  it("subtracts calendar PT days rather than 24-hour periods across fall DST", () => {
    const nearDst = args.map((arg) => arg === "2026-11-08T12:00:00Z" ? "2026-11-02T07:30:00Z" : arg === "2026-11-07" ? "2026-10-31" : arg === "2026-11-01" ? "2026-10-25" : arg);
    expect(JSON.parse(planCli(nearDst).text).matureThrough).toBe("2026-10-29");
    expect(planCli([...args, "--review-end", "2026-11-10"]).code).toBe(1);
    expect(planCli(args.filter((arg, index) => args[index - 1] !== "--review-start" && arg !== "--review-start")).code).toBe(1);
    expect(planCli([...args, "--coverage", "partial"]).text).toContain('"completeClaimsAllowed": false');
  });
  it("uses PT calendar maturity, Shanghai full days and DST bounds", () => {
    expect(dayBounds("2026-03-08", "America/Los_Angeles")[1] - dayBounds("2026-03-08", "America/Los_Angeles")[0]).toBe(23 * 3600000);
    expect(dayBounds("2026-11-01", "America/Los_Angeles")[1] - dayBounds("2026-11-01", "America/Los_Angeles")[0]).toBe(25 * 3600000);
    const plan = JSON.parse(planCli(args.map((arg) => arg === "gsc" ? "umami" : arg)).text);
    expect(plan.matureThrough).toBe("2026-11-07");
    expect(plan.days[0].startUtc).toBe("2026-10-31T16:00:00.000Z");
    const early = planCli(args.map((arg) => arg === "2026-11-08T12:00:00Z" ? "2026-11-08T07:30:00Z" : arg));
    expect(early.code).toBe(1);
  });
});
