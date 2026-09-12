export type PaginationEntry = number | "ellipsis-start" | "ellipsis-end";

export function getPaginationEntries(currentPage: number, pageCount: number): PaginationEntry[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount])]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);
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
