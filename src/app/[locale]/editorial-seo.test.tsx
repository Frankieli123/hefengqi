import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import CasePage from "./cases/[slug]/page";
import SolutionPage from "./solutions/[slug]/page";
import { locales } from "@/types/domain";
vi.mock("@/lib/env", () => ({ env: { SITE_URL: "https://ricewind.com" } }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/content-repository", () => ({
  getEditorialBySlug: async () => ({ id: "item", slug: "real-item", title: "Visible title", summary: "Visible summary", body: ["Published body"], updatedAt: "2026-09-12T00:00:00.000Z" }),
  getEditorialAlternatePaths: async () => ({}), getSlugRedirect: async () => undefined,
}));
vi.mock("@/i18n/navigation", () => ({ Link: ({ locale = "en", href, ...props }: React.ComponentProps<"a"> & { locale?: string }) => <a href={`/${locale}${href}`} {...props} /> }));
it.each(locales)("matches visible case/solution breadcrumb and stable entity in %s", async (locale) => {
  for (const [Page, section] of [[CasePage, "cases"], [SolutionPage, "solutions"]] as const) {
    const $ = load(renderToStaticMarkup(await Page({ params: Promise.resolve({ locale, slug: "real-item" }) })));
    const graph = JSON.parse($('script[type="application/ld+json"]').text())["@graph"];
    expect($("h1").text()).toBe("Visible title");
    expect(graph[0].headline ?? graph[0].name).toBe($("h1").text());
    expect((graph[0].publisher ?? graph[0].provider)["@id"]).toBe("https://ricewind.com/#organization");
    expect(graph[1].itemListElement.map((item: { name: string }) => item.name)).toEqual(["home", section, "Visible title"]);
    expect($(`a[href="/${locale}/${section}"]`).length).toBeGreaterThan(0);
    // These evergreen pages do not display a byline or publication/modification time.
    expect(graph[0]).not.toHaveProperty("dateModified");
    expect(graph[0]).not.toHaveProperty("author");
  }
});
