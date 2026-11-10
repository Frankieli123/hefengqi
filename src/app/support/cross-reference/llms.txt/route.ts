import { crossReferenceContent } from "@/content/llms-cross-reference";

export const dynamic = "force-dynamic";

export function GET() {
  const content = `# RICEWIND — Telecom Power Cross-Reference & Replacement Knowledge Base

${crossReferenceContent}

## Technical Inquiry & Engineering Pinout Confirmation
- Need engineering confirmation on backplane busbar capacity or controller pinout diagrams?
- 24/7 WhatsApp Technical Desk: +86 17621197907 | Email: lee@ricewind.com
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
