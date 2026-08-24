export function getPaginationPageNumbers(
  currentPage: number,
  totalPages: number,
  pageGroupSize: number,
): number[] {
  if (!totalPages) return [];

  const currentGroup = Math.ceil(currentPage / pageGroupSize);
  const startPage = (currentGroup - 1) * pageGroupSize + 1;
  const endPage = Math.min(startPage + pageGroupSize - 1, totalPages);

  return Array.from(
    { length: Math.max(0, endPage - startPage + 1) },
    (_, index) => startPage + index,
  );
}
