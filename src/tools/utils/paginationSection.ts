export interface PaginationArgs {
  readonly pageSize?: number;
  readonly pageNumber?: number;
  readonly totalHits?: number;
  readonly pageCount?: number;
}

const calculateTotalPages = (
  totalHits: number | undefined,
  pageSize: number,
) => {
  if (!pageSize || pageSize <= 0) return 0;
  if (totalHits === undefined) return 1;
  return Math.ceil(totalHits / pageSize);
};

export function paginationSection(
  totalSectionName: string,
  { pageSize, pageNumber, totalHits, pageCount }: PaginationArgs,
) {
  let formattedTotalPages: string | number = "N/A";
  if (pageCount !== undefined) {
    formattedTotalPages = pageCount;
  } else if (pageSize !== undefined) {
    formattedTotalPages = calculateTotalPages(totalHits, pageSize);
  }

  return {
    pageNumber: pageNumber ?? "N/A",
    pageSize: pageSize ?? "N/A",
    totalPages: formattedTotalPages,
    [totalSectionName]: totalHits ?? "N/A",
  };
}
