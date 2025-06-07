import { describe, expect, test } from "vitest";
import { sampleEvenly } from "./sampleEvenly.js";

describe("sampleEvenly", () => {
  test("returns evenly distributed items when sample size is less than list length", () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = sampleEvenly(list, 4);
    expect(result).toStrictEqual([1, 3, 6, 8]);
  });

  test("returns original list when sample size is greater than or equal to list length", () => {
    const list = [1, 2, 3, 4];
    expect(sampleEvenly(list, 4)).toStrictEqual(list);
    expect(sampleEvenly(list, 5)).toStrictEqual(list);
  });
});
