import "dotenv/config";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { db } from "@/lib/db-core";
import { processEmailBatch } from "@/worker/email-worker";
import { processJobBatch, runRetentionMaintenance, scheduleWeeklyJobs } from "@/worker/job-worker";

const workerId = `worker-${randomUUID()}`; let stopping = false;
process.on("SIGTERM", () => { stopping = true; }); process.on("SIGINT", () => { stopping = true; });

async function main() {
  console.info("worker_started", { workerId });
  while (!stopping) {
    try { await scheduleWeeklyJobs(); const [emails, jobs, retained] = await Promise.all([processEmailBatch(workerId), processJobBatch(workerId), runRetentionMaintenance()]); await db.siteSetting.upsert({ where: { key: "workerHeartbeat" }, update: { value: { workerId, at: new Date().toISOString(), emails, jobs, retained } }, create: { key: "workerHeartbeat", value: { workerId, at: new Date().toISOString(), emails, jobs, retained } } }); await writeFile("/tmp/worker-ready", new Date().toISOString()); } catch (error) { console.error("worker_loop_failed", { workerId, error: error instanceof Error ? error.message : "unknown" }); }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  await db.$disconnect(); console.info("worker_stopped", { workerId });
}

void main();
