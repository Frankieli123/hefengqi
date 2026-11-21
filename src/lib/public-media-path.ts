const publicVariantPattern = /^[a-f0-9]{2}\/[a-f0-9]{64}-(?:(?:160|320)\.webp|(?:480|800|1200|1600|1920|2560|3840)\.(?:avif|webp|jpg))$/;
const legacyPngPattern = /^media\/[a-f0-9]{2}\/[a-f0-9]{64}\.png$/;

export function isValidPublicMediaPath(relativePath: string) {
  return publicVariantPattern.test(relativePath) || legacyPngPattern.test(relativePath);
}
