export function catalogPage(value: string | string[] | undefined): number | undefined {
  if (value === undefined) return 1;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return undefined;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : undefined;
}
export function paginatedPath(path: string, page: number): string { return page === 1 ? path : `${path}?page=${page}`; }
