import type { MediaAsset } from "@prisma/client";
import type { HeroImageSources } from "@/types/home-hero";

type HeroMediaAsset = Pick<MediaAsset, "kind" | "scanStatus" | "rightsApproved" | "width" | "height" | "storageKey" | "variants">;

function sourceSet(variants: unknown, format: "avif" | "webp" | "jpeg") {
  if (!variants || typeof variants !== "object" || Array.isArray(variants)) return undefined;
  const entries = Object.entries(variants as Record<string, unknown>).flatMap(([key, value]) => {
    const match = key.match(/^(\d+)-(avif|webp|jpeg)$/);
    return match && match[2] === format && typeof value === "string" ? [{ width: Number(match[1]), value }] : [];
  }).sort((left, right) => left.width - right.width);
  return entries.length ? entries.map(({ width, value }) => `/media/${value} ${width}w`).join(", ") : undefined;
}

export function mediaAssetToHeroImage(asset: HeroMediaAsset, focusX: number, focusY: number): HeroImageSources | undefined {
  if (asset.kind !== "IMAGE" || asset.scanStatus !== "CLEAN" || !asset.rightsApproved || !asset.width || !asset.height) return undefined;
  return {
    src: `/media/${asset.storageKey}`,
    width: asset.width,
    height: asset.height,
    avif: sourceSet(asset.variants, "avif"),
    webp: sourceSet(asset.variants, "webp"),
    jpeg: sourceSet(asset.variants, "jpeg"),
    focusX,
    focusY,
  };
}
