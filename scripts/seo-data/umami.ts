import { canonical, dateRange, dayBounds, knownEventSchema, umamiImage, type Options, type Run } from "./model";

export function exactIdentity(options: Pick<Options, "umamiIdentity">) {
  return options.umamiIdentity?.version === "3.4.0" && options.umamiIdentity.image === umamiImage;
}

export function probeDate(options: Options, now: Date) {
  const date = options.probeDate ?? options.start;
  dateRange(date, date, "Asia/Shanghai", now);
  if (!options.probeEvent || !options.events.length || options.events.some((event) => !knownEventSchema.safeParse(event).success)) throw new Error("EXACT_EVENT_CONFIGURATION_REQUIRED");
  return date;
}

export function validateUmamiProof(run: Run) {
  const proof = run.umamiCapability;
  if (!proof || run.source !== "umami" || run.completeness !== "configured_events_exact" || !exactIdentity({ umamiIdentity: proof.identity }) || proof.runId !== run.id || proof.property !== run.property || run.provenance !== `${proof.origin}/api/websites/{websiteId}/metrics:type=event`) throw new Error("INVALID_UMAMI_CAPABILITY_SCOPE");
  const dates = dateRange(run.start, run.end, "Asia/Shanghai", new Date(run.startedAt));
  const positive = proof.positive;
  const negative = proof.negative;
  const checks = run.umamiChecks;
  if (!checks || (["origin", "property", "runId", "contract", "schema", "identity", "umamiTunnel"] as const).some((key) => canonical(checks[key]) !== canonical(proof[key])) || checks.checks.some((check, index) => {
    const expected = index === 0 ? positive : negative;
    return check.outcome !== "passed" || check.rowCount !== expected.rowCount || check.event !== expected.event || check.date !== expected.date || check.startAt !== expected.startAt || check.endAt !== expected.endAt;
  })) throw new Error("INVALID_UMAMI_CHECKS");
  if (!knownEventSchema.safeParse(positive.event).success || positive.rowCount !== 1 || positive.count <= 0 || negative.rowCount !== 0 || negative.count !== 0 || !/^wp02-control-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(negative.event) || negative.date !== positive.date) throw new Error("INVALID_UMAMI_PROBE");
  dateRange(positive.date, positive.date, "Asia/Shanghai", new Date(run.startedAt));
  for (const evidence of [positive, negative, ...proof.measurements]) {
    const [start, end] = dayBounds(evidence.date, "Asia/Shanghai");
    if (evidence.startAt !== start || evidence.endAt !== end - 1 || evidence.rowCount === 0 && evidence.count !== 0) throw new Error("INVALID_UMAMI_WINDOW");
  }
  if (!run.events.length || run.events.some((event) => !knownEventSchema.safeParse(event).success) || proof.measurements.length !== dates.length * run.events.length || run.observations.length !== proof.measurements.length || run.days.some((day) => day.status !== "measured" || day.missingEvents.length)) throw new Error("INCOMPLETE_UMAMI_EVIDENCE");
  const seen = new Set<string>();
  for (const evidence of proof.measurements) {
    const key = canonical([evidence.date, evidence.event]);
    const row = run.observations.find((row) => row.date === evidence.date && row.event === evidence.event);
    if (seen.has(key) || !dates.includes(evidence.date) || !run.events.includes(evidence.event) || !row || row.metrics.contactClicks !== evidence.count) throw new Error("INVALID_UMAMI_MEASUREMENT");
    if (evidence.date === positive.date && evidence.event === positive.event && canonical(evidence) !== canonical(positive)) throw new Error("INCONSISTENT_UMAMI_PROBE_MEASUREMENT");
    seen.add(key);
  }
}
