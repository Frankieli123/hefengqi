/** Routes available in every supported locale without a CMS translation lookup. */
export const staticSeoPaths = ["", "/products", "/solutions", "/support/troubleshooting", "/cases", "/news", "/about", "/contact", "/privacy", "/terms"];

/** Modification timestamps cannot be in the future. Publication scheduling is a separate CMS gate. */
export function seoDate(value: string | Date | undefined, now: () => Date = () => new Date()): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/.exec(value);
    if (!match) return undefined;
    const [, year, month, day] = match;
    const calendar = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== `${year}-${month}-${day}`) return undefined;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.getTime() <= now().getTime() ? date.toISOString() : undefined;
}

export function catalogPage(value: string | string[] | undefined): number | undefined {
  if (value === undefined) return 1;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return undefined;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : undefined;
}

export function paginatedPath(path: string, page: number): string {
  return page === 1 ? path : `${path}?page=${page}`;
}
