export const CARD_IMAGE_WIDTHS = [160, 320, 480, 800] as const;

export function cardImageSrcSet(variants: unknown): string | undefined {
  if (!variants || typeof variants !== "object" || Array.isArray(variants)) return;
  const entries = variants as Record<string, unknown>;
  return CARD_IMAGE_WIDTHS.flatMap((width) => {
    const key = entries[`card-${width}-webp`];
    if (typeof key !== "string" || !/^[a-f0-9]{2}\/[a-f0-9]{64}-\d+\.webp$/.test(key)) return [];
    if (key.slice(0, 2) !== key.slice(3, 5) || !key.endsWith(`-${width}.webp`)) return [];
    return [`/media/${key} ${width}w`];
  }).join(", ") || undefined;
}
