import { describe, expect, it } from "vitest";
import { equipmentCategory, findSupportDevice, matchesSupportQuery, readSupportQuery, relatedSupportArticles, supportDevicePath, supportHref } from "@/lib/support";
import type { CategoryView, EditorialItem, ProductView } from "@/types/domain";

describe("support discovery", () => {
  it("matches model punctuation and spacing without discarding other search terms", () => {
    expect(matchesSupportQuery("Huawei R4850G2 整流模块", "Huawei R48 50-G2")).toBe(true);
    expect(matchesSupportQuery("Huawei R4850G2 整流模块", "Vertiv R4850G2")).toBe(false);
    expect(matchesSupportQuery("NetSure 731", "ＮｅｔＳｕｒｅ–７３１")).toBe(true);
  });

  it("preserves filter values in shareable URLs and rejects ambiguous or invalid page input", () => {
    const query = readSupportQuery({ q: " AC & DC ", brand: "huawei", type: "dc-power-systems", page: "2" });
    const url = new URL(supportHref(query), "https://example.com");
    expect(url.searchParams.get("q")).toBe("AC & DC");
    expect(url.searchParams.get("brand")).toBe("huawei");
    expect(url.searchParams.get("type")).toBe("dc-power-systems");
    expect(readSupportQuery({ q: ["one", "two"], page: "Infinity" })).toEqual({ q: "", brand: "", type: "", page: 1 });
    expect(readSupportQuery({ page: "-2" }).page).toBe(1);
  });

  it("uses the equipment category instead of a brand leaf and handles malformed trees", () => {
    const product = { categoryKey: "huawei-dc", categoryName: "Huawei" } as ProductView;
    const categories = [{ key: "huawei-dc", name: "Huawei", level: 3, parentKey: "dc" }, { key: "dc", name: "DC power", level: 2 }] as CategoryView[];
    expect(equipmentCategory(product, categories)).toEqual({ key: "dc", name: "DC power" });
    expect(equipmentCategory(product, [{ ...categories[0], parentKey: "huawei-dc" }])).toEqual({ key: "huawei-dc", name: "Huawei" });
  });

  it("does not suggest technical applicability from a shared brand or model keyword", () => {
    const product = { id: "model-a", brand: "Huawei", model: "R4850" } as ProductView;
    const articles = [
      { id: "explicit", title: "Guide", relatedProductSlots: [{ productId: "model-a", sortOrder: 0 }] },
      { id: "unrelated", title: "Huawei R4850" },
      { id: "other-model", title: "Huawei", relatedProductSlots: [{ productId: "model-b", sortOrder: 0 }] },
    ] as EditorialItem[];
    expect(relatedSupportArticles(product, articles).map((article) => article.id)).toEqual(["explicit"]);
  });

  it("keeps the model path language-independent and encodes reserved characters", () => {
    expect(supportDevicePath({ brand: "Vertiv", model: "NetSure 731/A" })).toBe("/support/troubleshooting/vertiv/netsure%20731%2Fa");
  });

  it("resolves encoded page params and decoded metadata params to the same device", () => {
    const product = { id: "netsure", brand: "Vertiv", model: "NetSure 731/A" } as ProductView;
    expect(findSupportDevice([product], "vertiv", "netsure%20731%2Fa")).toBe(product);
    expect(findSupportDevice([product], "vertiv", "netsure 731/a")).toBe(product);
    expect(findSupportDevice([product], "huawei", "netsure 731/a")).toBeUndefined();
    expect(findSupportDevice([product], "vertiv", "%invalid")).toBeUndefined();
  });
});
