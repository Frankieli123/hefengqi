import { describe, expect, it } from "vitest";
import { getPaginationEntries } from "@/lib/pagination";

describe("getPaginationEntries", () => {
  it("keeps short pagination ranges intact", () => {
    expect(getPaginationEntries(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses distant pages around the current page", () => {
    expect(getPaginationEntries(10, 20)).toEqual([1, "ellipsis-start", 7, 8, 9, 10, 11, 12, 13, "ellipsis-end", 20]);
  });

  it("fills the available desktop range near either edge", () => {
    expect(getPaginationEntries(1, 20)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, "ellipsis-end", 20]);
    expect(getPaginationEntries(20, 20)).toEqual([1, "ellipsis-start", 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it("keeps the current page in range when input is outside the page count", () => {
    expect(getPaginationEntries(99, 20)).toEqual([1, "ellipsis-start", 13, 14, 15, 16, 17, 18, 19, 20]);
  });
});
