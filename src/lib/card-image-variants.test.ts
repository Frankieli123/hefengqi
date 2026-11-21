import { describe, expect, it } from "vitest";
import { cardImageSrcSet } from "./card-image-variants";

const hash = "ab".repeat(32);
const key = (width: number) => `ab/${hash}-${width}.webp`;

describe("cardImageSrcSet", () => {
  it("lists only registered card variants in ascending order", () => {
    expect(cardImageSrcSet({ "card-480-webp": key(480), "card-160-webp": key(160), "1200-webp": key(1200) }))
      .toBe(`/media/${key(160)} 160w, /media/${key(480)} 480w`);
  });

  it("preserves the legacy fallback when there are no card variants", () => {
    expect(cardImageSrcSet(null)).toBeUndefined();
    expect(cardImageSrcSet({ "800-webp": key(800) })).toBeUndefined();
  });

  it("rejects mismatched dimensions, hash prefixes and untrusted paths", () => {
    expect(cardImageSrcSet({ "card-160-webp": key(320), "card-320-webp": `ca/${hash}-320.webp`, "card-480-webp": "https://example.com/x.webp", "card-800-webp": "../x.webp" })).toBeUndefined();
  });
});
