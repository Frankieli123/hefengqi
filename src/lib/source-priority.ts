import type { ContentOrigin } from "@/types/domain";

const priority: Record<ContentOrigin, number> = { MANUAL: 4, LOCAL_IMPORT: 3, WEB_SOURCE: 2, AI: 1 };
export interface SourcedValue<T> { value: T; origin: ContentOrigin; locked: boolean; source?: string; }
export function chooseSourcedValue<T>(current: SourcedValue<T> | undefined, candidate: SourcedValue<T>): SourcedValue<T> {
  if (!current) return candidate;
  if (current.locked || priority[current.origin] > priority[candidate.origin]) return current;
  if (priority[current.origin] === priority[candidate.origin] && current.value !== undefined && current.value !== null && current.value !== "") return current;
  return candidate;
}
