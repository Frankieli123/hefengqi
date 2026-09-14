import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeEditorialStatus } from "./actions";

const { findNews, updateNews, audit, requireAdmin } = vi.hoisted(() => ({ findNews: vi.fn(), updateNews: vi.fn(), audit: vi.fn(), requireAdmin: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/lib/admin-session", () => ({ requireSecureAdmin: requireAdmin }));
vi.mock("@/lib/db", () => ({ db: { newsArticle: { findUnique: findNews, update: updateNews }, auditLog: { create: audit } } }));
vi.mock("@/lib/env", () => ({ env: { SITE_URL: "https://ricewind.com" } }));
vi.mock("@/lib/edgeone", () => ({ purgeEdgeOne: vi.fn() }));
vi.mock("@/lib/imported-records", () => ({ applyImportedRecordToProduct: vi.fn() }));
vi.mock("@/lib/publication", () => ({ validateProductForPublication: vi.fn() }));
vi.mock("@/lib/home-hero-schema", () => ({ parseHomeHeroFormData: vi.fn() }));
vi.mock("@/app/admin/category-actions", () => ({ saveCategory: vi.fn() }));
vi.mock("@/lib/category-management", () => ({ categoryErrorMessage: vi.fn(), setManagedCategoryStatus: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ createStoredAiApiKey: vi.fn() }));

const translations = ["zh", "en", "ru"].map((locale) => ({ locale, slug: `${locale}-guide`, title: "Title", summary: "Summary", seoTitle: "Title", seoDescription: "Description", body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Actual article" }] }] } }));

function statusForm(status = "PUBLISHED") {
  const form = new FormData();
  form.set("type", "news");
  form.set("id", "news-1");
  form.set("status", status);
  return form;
}

describe("news publication date", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    updateNews.mockResolvedValue({});
    audit.mockResolvedValue({});
  });

  it("preserves the first publication date when republishing", async () => {
    const publishedAt = new Date("2026-09-10T00:00:00.000Z");
    findNews.mockResolvedValue({ publishedAt, translations });
    await expect(changeEditorialStatus(statusForm())).rejects.toThrow("redirect:/admin/editorial?status=published");
    expect(requireAdmin).toHaveBeenCalledWith("ADMIN");
    expect(updateNews).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ publishedAt }) }));
    expect(audit).toHaveBeenCalledOnce();
  });

  it("sets a real timestamp on first publication", async () => {
    findNews.mockResolvedValue({ publishedAt: null, translations });
    const started = Date.now();
    await expect(changeEditorialStatus(statusForm())).rejects.toThrow("redirect:/admin/editorial?status=published");
    const publishedAt = updateNews.mock.calls[0][0].data.publishedAt;
    expect(publishedAt).toBeInstanceOf(Date);
    expect(publishedAt.getTime()).toBeGreaterThanOrEqual(started);
    expect(publishedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("does not erase the publication date when unpublishing", async () => {
    findNews.mockResolvedValue({ publishedAt: new Date("2026-09-10T00:00:00.000Z"), translations });
    await expect(changeEditorialStatus(statusForm("DRAFT"))).rejects.toThrow("redirect:/admin/editorial?status=draft");
    expect(updateNews.mock.calls[0][0].data.publishedAt).toBeUndefined();
  });

  it("still rejects publishing incomplete translations without writes", async () => {
    findNews.mockResolvedValue({ publishedAt: null, translations: translations.slice(0, 1) });
    await expect(changeEditorialStatus(statusForm())).rejects.toThrow("redirect:/admin/editorial?error=missing-translations");
    expect(updateNews).not.toHaveBeenCalled();
  });
});
