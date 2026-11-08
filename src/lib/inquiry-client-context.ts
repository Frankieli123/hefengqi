export function referrerOrigin(value: string): string | undefined {
  if (/^https?:\/\/[^/?#]*@/i.test(value)) return undefined;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return undefined;
    return `${url.protocol}//${url.hostname}`;
  } catch { return undefined; }
}
