import type { CrawlJob } from "@prisma/client";
import { db } from "@/lib/db-core";
import { extractPublicFacts, fetchStaticHtml, robotsAllows } from "@/worker/crawler";

async function acquireSourceRateLimit(sourceId: string, limit: number) {
  const key = `crawl:${sourceId}`;
  await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ count: number; windowStart: Date }>>`SELECT "count", "windowStart" FROM "RateLimitBucket" WHERE "key" = ${key} FOR UPDATE`;
    const current = rows[0]; const now = new Date();
    if (!current) { await tx.rateLimitBucket.create({ data: { key, count: 1, windowStart: now } }); return; }
    if (now.getTime() - current.windowStart.getTime() >= 60_000) { await tx.rateLimitBucket.update({ where: { key }, data: { count: 1, windowStart: now } }); return; }
    if (current.count >= Math.max(1, limit)) throw new Error("SOURCE_RATE_LIMITED");
    await tx.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
  });
}

async function lease(workerId: string) {
  return db.$transaction(async (tx) => {
    const jobs = await tx.$queryRaw<CrawlJob[]>`SELECT * FROM "CrawlJob" WHERE (status = 'PENDING' OR (status = 'RUNNING' AND "leaseUntil" < NOW())) AND "availableAt" <= NOW() ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 2`;
    if (!jobs.length) return [];
    await tx.crawlJob.updateMany({ where: { id: { in: jobs.map((job) => job.id) } }, data: { status: "RUNNING", leaseUntil: new Date(Date.now() + 10 * 60_000), leasedBy: workerId } }); return jobs;
  });
}

async function processJob(job: CrawlJob) {
  if (!job.sourceId) throw new Error("SOURCE_REQUIRED"); const source = await db.crawlSource.findUnique({ where: { id: job.sourceId } }); if (!source || !source.enabled) throw new Error("SOURCE_DISABLED");
  await acquireSourceRateLimit(source.id, source.rateLimitPerMin);
  if (!(await robotsAllows(source.baseUrl, source.allowedHosts))) throw new Error("ROBOTS_DISALLOWED");
  const page = await fetchStaticHtml(source.baseUrl, source.allowedHosts, source.maxResponseBytes); const result = await extractPublicFacts(page.html, page.url);
  await db.importedRecord.upsert({ where: { sourceHash: page.hash }, update: { extracted: result.extracted, evidence: result.evidence, confidence: result.confidence, status: "NEEDS_REVIEW" }, create: { crawlJobId: job.id, sourceUrl: page.url, sourceHash: page.hash, extracted: result.extracted, evidence: result.evidence, confidence: result.confidence, status: "NEEDS_REVIEW" } });
}

export async function processJobBatch(workerId: string) {
  const jobs = await lease(workerId);
  for (const job of jobs) { try { await processJob(job); await db.crawlJob.update({ where: { id: job.id }, data: { status: "SUCCEEDED", attempts: { increment: 1 }, leaseUntil: null, leasedBy: null, lastError: null } }); } catch (error) { const attempts = job.attempts + 1; const dead = attempts >= job.maxAttempts; await db.crawlJob.update({ where: { id: job.id }, data: { status: dead ? "DEAD" : "PENDING", attempts, availableAt: new Date(Date.now() + Math.min(360, 2 ** attempts) * 60_000), leaseUntil: null, leasedBy: null, lastError: error instanceof Error ? error.message.slice(0, 1000) : "unknown" } }); } }
  return jobs.length;
}

export async function scheduleWeeklyJobs() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60_000); const sources = await db.crawlSource.findMany({ where: { enabled: true, jobs: { none: { createdAt: { gte: since }, kind: "WEEKLY_CRAWL" } } } }); if (sources.length) await db.crawlJob.createMany({ data: sources.map((source) => ({ sourceId: source.id, kind: "WEEKLY_CRAWL", payload: { scheduled: true } })) }); return sources.length;
}

export async function runRetentionMaintenance() {
  const heartbeat = await db.siteSetting.findUnique({ where: { key: "retentionMaintenance" } });
  const lastRun = heartbeat?.value as { at?: string } | null;
  if (lastRun?.at && Date.now() - new Date(lastRun.at).getTime() < 24 * 60 * 60_000) return 0;
  const cutoff = new Date(); cutoff.setUTCMonth(cutoff.getUTCMonth() - 24);
  const [outbox, inquiries] = await db.$transaction([
    db.emailOutbox.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    db.inquiry.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);
  await db.siteSetting.upsert({ where: { key: "retentionMaintenance" }, update: { value: { at: new Date().toISOString(), outbox: outbox.count, inquiries: inquiries.count } }, create: { key: "retentionMaintenance", value: { at: new Date().toISOString(), outbox: outbox.count, inquiries: inquiries.count } } });
  return outbox.count + inquiries.count;
}
