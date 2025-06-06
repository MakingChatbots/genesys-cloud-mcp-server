export interface PaginationArgs {
  readonly pageSize?: number;
  readonly pageNumber?: number;
  readonly totalHits?: number;
  readonly pageCount?: number;
}

export function paginationSection(
  totalSectionName: string,
  { pageSize, pageNumber, totalHits, pageCount }: PaginationArgs,
): string[] {
  const calculateTotalPages = (
    totalHits: number | undefined,
    pageSize: number,
  ) => {
    if (totalHits === 0 && pageSize === 0) {
      return 1;
    } else {
      return Math.max(1, Math.ceil((totalHits ?? 0) / pageSize));
    }
  };

  let formattedTotalPages = "N/A";
  if (pageCount !== undefined) {
    formattedTotalPages = String(pageCount);
  } else if (pageSize !== undefined && pageSize > 0) {
    formattedTotalPages = String(calculateTotalPages(totalHits, pageSize));
  }

  return [
    "--- Pagination Info ---",
    `Page Number: ${pageNumber ? String(pageNumber) : "N/A"}`,
    `Page Size: ${pageSize ? String(pageSize) : "N/A"}`,
    `Total Pages: ${formattedTotalPages}`,
    `${totalSectionName}: ${totalHits ? String(totalHits) : "N/A"}`,
  ];
}
