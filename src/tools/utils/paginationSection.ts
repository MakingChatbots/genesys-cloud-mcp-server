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

type PaginationResult<T extends string> = Record<T, string | number> & {
  pageNumber: string | number;
  pageSize: string | number;
  totalPages: string | number;
};

export function paginationSection<T extends string>(
  totalSectionName: T,
  { pageSize, pageNumber, totalHits, pageCount }: PaginationArgs,
): PaginationResult<T> {
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
  } as PaginationResult<T>;
}
