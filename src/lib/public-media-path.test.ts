import { describe, expect, it } from "vitest";
import { isValidPublicMediaPath } from "./public-media-path";

describe("public legacy image compatibility", () => {
  it("accepts the existing double-media PNG path for the internal image optimizer", () => {
    expect(isValidPublicMediaPath("media/ab/ab417dbbedc6f6c53fc4b0a48d076821dcbaaaf3505a7985e9768e7821a32e8a.png")).toBe(true);
  });

  it("still rejects traversal, arbitrary originals and unknown extensions", () => {
    expect(isValidPublicMediaPath("media/../../.env")).toBe(false);
    expect(isValidPublicMediaPath("media/ab/not-a-hash.png")).toBe(false);
    expect(isValidPublicMediaPath("ab/ab417dbbedc6f6c53fc4b0a48d076821dcbaaaf3505a7985e9768e7821a32e8a.png")).toBe(false);
  });
});
