import { env } from "@/lib/env";
import type { VisitorPageViewOptions } from "./analytics-service";
function zonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

const DAY_MS = 86_400_000;
const VISITOR_RETENTION_DAYS = 90;

function validDateInput(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dateInput(value: Date, timezone: string) {
  const parts = zonedParts(value, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function calendarParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function addCalendarDay(value: string) {
  const { year, month, day } = calendarParts(value);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

function timezoneOffset(value: Date, timezone: string) {
  const parts = zonedParts(value, timezone);
  const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return representedAsUtc - Math.floor(value.getTime() / 1_000) * 1_000;
}

export function startOfCalendarDate(value: string, timezone: string) {
  const { year, month, day } = calendarParts(value);
  const target = Date.UTC(year, month - 1, day);
  let result = new Date(target);
  result = new Date(target - timezoneOffset(result, timezone));
  result = new Date(target - timezoneOffset(result, timezone));
  return result;
}

export function resolveVisitorDateRange(
  input: VisitorPageViewOptions = {},
  now = new Date(),
  timezone = env.UMAMI_TIMEZONE,
) {
  const today = dateInput(now, timezone);
  const defaultStart = dateInput(new Date(now.getTime() - 29 * DAY_MS), timezone);
  const rawStart = validDateInput(input.startDate) ? input.startDate : defaultStart;
  const requestedStart = rawStart > today ? today : rawStart;
  const rawEnd = validDateInput(input.endDate) ? input.endDate : today;
  const cappedEnd = rawEnd > today ? today : rawEnd;
  const endDate = cappedEnd < requestedStart ? requestedStart : cappedEnd;
  const retentionFloor = new Date(now.getTime() - VISITOR_RETENTION_DAYS * DAY_MS);
  let start = startOfCalendarDate(requestedStart, timezone);
  if (start < retentionFloor) start = retentionFloor;
  const requestedEnd = startOfCalendarDate(addCalendarDay(endDate), timezone);
  return {
    start,
    end: requestedEnd > now ? now : requestedEnd,
    startDate: dateInput(start, timezone),
    endDate,
  };
}

