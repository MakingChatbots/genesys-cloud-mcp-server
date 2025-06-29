import { expect, test } from "vitest";
import { PaginationArgs, paginationSection } from "./paginationSection.js";

const testCases: {
  name: string;
  input: PaginationArgs;
  expected: ReturnType<typeof paginationSection>;
}[] = [
  {
    name: "All zeros",
    input: {
      pageSize: 0,
      pageNumber: 0,
      totalHits: 0,
    },
    expected: {
      pageNumber: "N/A",
      pageSize: "N/A",
      totalPages: "N/A",
      totalConversationsReturned: "N/A",
    },
  },
  {
    name: "Missing total hits",
    input: {
      pageSize: 100,
      pageNumber: 1,
    },
    expected: {
      pageNumber: 1,
      pageSize: 100,
      totalPages: 1,
      totalConversationsReturned: "N/A",
    },
  },

  {
    name: "Divisible hit count",
    input: {
      pageSize: 100,
      pageNumber: 1,
      totalHits: 200,
    },
    expected: {
      pageNumber: 1,
      pageSize: 100,
      totalPages: 2,
      totalConversationsReturned: 200,
    },
  },
  {
    name: "Non-divisible hit count",
    input: {
      pageSize: 100,
      pageNumber: 1,
      totalHits: 201,
    },
    expected: {
      pageNumber: 1,
      pageSize: 100,
      totalPages: 3,
      totalConversationsReturned: 201,
    },
  },
];

test.each(testCases)("should correctly parse: $name", ({ input, expected }) => {
  expect(paginationSection("totalConversationsReturned", input)).toStrictEqual(
    expected,
  );
});
