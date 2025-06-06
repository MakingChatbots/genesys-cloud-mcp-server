import { expect, test } from "vitest";
import { PaginationArgs, paginationSection } from "./paginationSection.js";

const testCases: {
  name: string;
  input: PaginationArgs;
  expected: string[];
}[] = [
  {
    name: "All zeros",
    input: {
      pageSize: 0,
      pageNumber: 0,
      totalHits: 0,
    },
    expected: [
      "--- Pagination Info ---",
      "Page Number: N/A",
      "Page Size: N/A",
      "Total Pages: N/A",
      "Total Conversations returned: N/A",
    ],
  },
  {
    name: "Missing total hits",
    input: {
      pageSize: 100,
      pageNumber: 1,
    },
    expected: [
      "--- Pagination Info ---",
      "Page Number: 1",
      "Page Size: 100",
      "Total Pages: 1",
      "Total Conversations returned: N/A",
    ],
  },
  {
    name: "Divisible hit count",
    input: {
      pageSize: 100,
      pageNumber: 1,
      totalHits: 200,
    },
    expected: [
      "--- Pagination Info ---",
      "Page Number: 1",
      "Page Size: 100",
      "Total Pages: 2",
      "Total Conversations returned: 200",
    ],
  },
  {
    name: "Non-divisible hit count",
    input: {
      pageSize: 100,
      pageNumber: 1,
      totalHits: 201,
    },
    expected: [
      "--- Pagination Info ---",
      "Page Number: 1",
      "Page Size: 100",
      "Total Pages: 3",
      "Total Conversations returned: 201",
    ],
  },
];

test.each(testCases)("should correctly parse: $name", ({ input, expected }) => {
  expect(
    paginationSection("Total Conversations returned", input),
  ).toStrictEqual(expected);
});
