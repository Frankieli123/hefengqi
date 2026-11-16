export const dynamic = "force-dynamic";

export function GET() {
  return new Response("82a0a524b31046f1961939f0fd04e36c", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
