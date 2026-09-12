import { describe, expect, it } from "vitest";
import { getPaginationEntries } from "@/lib/pagination";

describe("getPaginationEntries", () => {
  it("keeps short pagination ranges intact", () => {
    expect(getPaginationEntries(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses distant pages around the current page", () => {
    expect(getPaginationEntries(10, 20)).toEqual([1, "ellipsis-start", 9, 10, 11, "ellipsis-end", 20]);
  });

  it("does not add redundant ellipses near either edge", () => {
    expect(getPaginationEntries(1, 20)).toEqual([1, 2, "ellipsis-end", 20]);
    expect(getPaginationEntries(20, 20)).toEqual([1, "ellipsis-start", 19, 20]);
  });
});
