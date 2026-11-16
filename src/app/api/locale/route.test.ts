import { beforeEach, describe, expect, it, vi } from "vitest";

const { industrySource, industryTarget, newsSource, newsTarget } = vi.hoisted(() => ({
  industrySource: vi.fn(),
  industryTarget: vi.fn(),
  newsSource: vi.fn(),
  newsTarget: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    industryTranslation: { findFirst: industrySource, findUnique: industryTarget },
    caseStudyTranslation: { findFirst: vi.fn(), findUnique: vi.fn() },
    newsArticleTranslation: { findFirst: newsSource, findUnique: newsTarget },
    categoryTranslation: { findFirst: vi.fn(), findUnique: vi.fn() },
    productTranslation: { findFirst: vi.fn(), findUnique: vi.fn() },
  },
}));

import { POST } from "@/app/api/locale/route";

function localeRequest(locale: string, pathname: string) {
  return new Request("http://localhost/api/locale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale, pathname }),
  });
}

describe("locale route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps a solution to the target language slug by its industry id", async () => {
    industrySource.mockResolvedValue({ industryId: "industry-telecom" });
    industryTarget.mockResolvedValue({ slug: "telecom-et-5g", published: true });

    const response = await POST(localeRequest("fr", "/zh/solutions/telecom-5g"));

    await expect(response.json()).resolves.toMatchObject({ targetPath: "/solutions/telecom-et-5g" });
    expect(industrySource).toHaveBeenCalledWith(expect.objectContaining({
      where: { slug: "telecom-5g", published: true, locale: "zh" },
    }));
    expect(industryTarget).toHaveBeenCalledWith(expect.objectContaining({
      where: { industryId_locale: { industryId: "industry-telecom", locale: "fr" } },
    }));
  });

  it("maps news slugs without changing the public section", async () => {
    newsSource.mockResolvedValue({ articleId: "news-guide" });
    newsTarget.mockResolvedValue({ slug: "leitfaden", published: true });

    const response = await POST(localeRequest("de", "/en/news/guide"));

    await expect(response.json()).resolves.toMatchObject({ targetPath: "/news/leitfaden" });
  });
});
