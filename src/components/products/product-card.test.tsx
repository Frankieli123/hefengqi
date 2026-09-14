import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductCard } from "@/components/products/product-card";
import type { ProductView } from "@/types/domain";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ locale, href, prefetch, ...props }: React.ComponentProps<"a"> & { locale?: string; prefetch?: boolean }) => {
    void prefetch;
    return <a href={`/${locale}${href}`} {...props} />;
  },
}));

const product = {
  id: "product-1",
  slug: "huawei-100g-cfp2-10km-ar",
  name: "وحدة بصرية Huawei CFP2 بسرعة 100G",
  model: "100G CFP2 10KM",
  brand: "Huawei",
  categoryName: "الاتصالات البصرية",
  shortDescription: "وحدة بصرية لمسافة 10 كم.",
  image: undefined,
} as ProductView;

describe("ProductCard", () => {
  it("keeps every product and inquiry link in the explicitly supplied locale", () => {
    render(
      <ProductCard
        product={product}
        locale="ar"
        labels={{ details: "عرض التفاصيل", inquiry: "إرسال استفسار", model: "الطراز" }}
      />,
    );

    const links = screen.getAllByRole("link");
    expect(links.filter((link) => link.getAttribute("href") === "/ar/products/huawei-100g-cfp2-10km-ar")).toHaveLength(3);
    expect(links.some((link) => link.getAttribute("href") === "/ar/contact?productId=product-1")).toBe(true);
    expect(links.every((link) => !link.getAttribute("href")?.startsWith("/en/"))).toBe(true);
  });
});
