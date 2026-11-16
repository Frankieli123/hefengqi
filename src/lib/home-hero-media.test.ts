import { describe, expect, it } from "vitest";
import { mediaAssetToHeroImage } from "@/lib/home-hero-media";

const cleanAsset = {
  kind: "IMAGE" as const,
  scanStatus: "CLEAN" as const,
  rightsApproved: true,
  width: 1920,
  height: 1080,
  storageKey: "aa/hash-1200.webp",
  variants: { "480-webp": "aa/hash-480.webp", "1200-webp": "aa/hash-1200.webp", "1200-avif": "aa/hash-1200.avif" },
};

describe("hero media gate", () => {
  it("creates ordered responsive sources for approved clean images", () => {
    const image = mediaAssetToHeroImage(cleanAsset, 72, 50);
    expect(image?.webp).toBe("/media/aa/hash-480.webp 480w, /media/aa/hash-1200.webp 1200w");
    expect(image?.focusX).toBe(72);
  });

  it("rejects unapproved or unsafe assets", () => {
    expect(mediaAssetToHeroImage({ ...cleanAsset, rightsApproved: false }, 50, 50)).toBeUndefined();
    expect(mediaAssetToHeroImage({ ...cleanAsset, scanStatus: "REJECTED" }, 50, 50)).toBeUndefined();
    expect(mediaAssetToHeroImage({ ...cleanAsset, kind: "DOCUMENT" }, 50, 50)).toBeUndefined();
  });
});
