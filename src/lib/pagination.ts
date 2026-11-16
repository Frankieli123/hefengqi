export type PaginationEntry = number | "ellipsis-start" | "ellipsis-end";

export function getPaginationEntries(currentPage: number, pageCount: number): PaginationEntry[] {
  const maxVisiblePages = 9;
  const siblingCount = 3;

  if (pageCount <= maxVisiblePages) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const clampedPage = Math.min(Math.max(currentPage, 1), pageCount);
  const interiorPageCount = maxVisiblePages - 2;
  let windowStart = Math.max(2, clampedPage - siblingCount);
  let windowEnd = Math.min(pageCount - 1, clampedPage + siblingCount);

  if (windowStart <= 3) {
    windowStart = 2;
    windowEnd = Math.min(pageCount - 1, windowStart + interiorPageCount - 1);
  } else if (windowEnd >= pageCount - 2) {
    windowEnd = pageCount - 1;
    windowStart = Math.max(2, windowEnd - interiorPageCount + 1);
  }

  const pages = [
    1,
    ...Array.from({ length: windowEnd - windowStart + 1 }, (_, index) => windowStart + index),
    pageCount,
  ];
  const entries: PaginationEntry[] = [];

  pages.forEach((page, index) => {
    const previousPage = pages[index - 1];
    if (previousPage && page - previousPage > 1) {
      entries.push(previousPage === 1 ? "ellipsis-start" : "ellipsis-end");
    }
    entries.push(page);
  });

  return entries;
}
