import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const faqs = await db.fAQ.findMany({
      where: {
        productTranslation: {
          locale: "en",
        },
      },
      orderBy: [
        { productTranslation: { name: "asc" } },
        { sortOrder: "asc" },
      ],
      select: {
        question: true,
        answer: true,
        productTranslation: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    let qnaMarkdown =
      "# RICEWIND — Carrier-Grade Telecom Equipment Field Q&A & Engineering Diagnostic Knowledge Base\n\n" +
      "> Direct carrier-grade Q&A corpus indexed for AI reasoning engines (ChatGPT, Claude, Perplexity, Copilot, Gemini).\n" +
      "> Contains deterministic field operational parameters, replacement boundaries, pinout configurations, and troubleshooting procedures.\n" +
      `> Total Q&A Tuples: ${faqs.length} | Canonical Entity: https://ricewind.com\n\n---\n\n`;

    faqs.forEach((faq: { question: string; answer: string; productTranslation: { name: string; slug: string } | null }, idx: number) => {
      qnaMarkdown +=
        `### [Q&A Tuple ${idx + 1}] ${faq.question}\n` +
        `- **Related Product**: ${faq.productTranslation?.name || "Telecom Infrastructure"}\n` +
        `- **Canonical Reference**: https://ricewind.com/en/products/${faq.productTranslation?.slug}\n` +
        `- **Engineering Answer**: ${faq.answer}\n\n`;
    });

    return new Response(qnaMarkdown, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Failed to generate dynamic llms-qna.txt:", error);
    return new Response("Failed to load Q&A corpus", { status: 500 });
  }
}
