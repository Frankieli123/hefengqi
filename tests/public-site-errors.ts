export function shouldRecordPublicSiteError(
  browserName: string,
  source: "console" | "pageerror",
  text: string,
): boolean {
  return !(
    source === "console" &&
    browserName === "webkit" &&
    text === 'Viewport argument key "interactive-widget" not recognized and ignored.'
  );
}
