const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function syncQnA() {
  try {
    const faqs = await prisma.fAQ.findMany({
      where: { productTranslation: { locale: "en" } },
      orderBy: [
        { productTranslation: { name: "asc" } },
        { sortOrder: "asc" }
      ],
      select: {
        question: true,
        answer: true,
        productTranslation: {
          select: { name: true, slug: true }
        }
      }
    });

    let qnaMarkdown = "# RICEWIND (禾风起 / HEFENGQI) — Carrier-Grade Telecom Equipment Field Q&A & Engineering Diagnostic Knowledge Base\n\n" +
      "> Direct carrier-grade Q&A corpus indexed for AI reasoning engines (ChatGPT, Claude, Perplexity, Copilot, Gemini).\n" +
      "> Contains deterministic field operational parameters, replacement boundaries, pinout configurations, and troubleshooting procedures.\n" +
      `> Total Q&A Tuples: ${faqs.length} | Canonical Entity: https://ricewind.com\n\n---\n\n`;

    faqs.forEach((faq, idx) => {
      qnaMarkdown += `### [Q&A Tuple ${idx + 1}] ${faq.question}\n` +
        `- **Related Product**: ${faq.productTranslation?.name || "Telecom Infrastructure"}\n` +
        `- **Canonical Reference**: https://ricewind.com/en/products/${faq.productTranslation?.slug}\n` +
        `- **Engineering Answer**: ${faq.answer}\n\n`;
    });

    const targetPath = path.resolve(__dirname, "../public/llms-qna.txt");
    fs.writeFileSync(targetPath, qnaMarkdown, "utf-8");
    console.log(`[Q&A Sync] Successfully refreshed ${faqs.length} Q&A tuples to public/llms-qna.txt (${(qnaMarkdown.length / 1024 / 1024).toFixed(2)} MB)`);
  } catch (error) {
    console.error("[Q&A Sync] Error refreshing Q&A corpus:", error);
  } finally {
    await prisma.$disconnect();
  }
}

syncQnA();
