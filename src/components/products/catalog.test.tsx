import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider, useLocale } from "next-intl";
import Link from "next/link";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Catalog } from "@/components/products/catalog";
import { ProductCard, ProductPreviewCard } from "@/components/products/product-card";
import { locales, type ProductListView } from "@/types/domain";

// next-intl/navigation uses extensionless Next imports outside Vitest's transform.
// Keep the real Next Link and Image components for their rendered DOM behavior.
vi.mock("@/i18n/navigation", () => ({
  Link: function LocalizedLink({ href, locale, ...props }: Omit<React.ComponentProps<typeof Link>, "locale"> & { locale?: string }) {
    const currentLocale = useLocale();
    return <Link {...props} href={`/${locale ?? currentLocale}${href}`} />;
  },
}));

const labels = {
  home: "Home", products: "Products", searchPlaceholder: "Search products", searchAction: "Search",
  category: "Category", allProducts: "All products", filters: "Filters", empty: "No products",
  emptyHelp: "Try another query", clear: "Clear", model: "Model", details: "Details",
  inquiry: "Inquiry", previous: "Previous", next: "Next",
};

const product: ProductListView = {
  id: "product-1", slug: "r4850g2", model: "R4850G2", brand: "Huawei",
  categoryKey: "rectifiers", categoryName: "Rectifiers", name: "R4850G2 Rectifier",
  shortDescription: "Telecom power",
};

describe("catalogue media and pagination", () => {
  afterEach(cleanup);

  it.each(["/media/ab/product-800.webp", "/media/ab/product-1200.webp"])("serves %s directly in both card layouts", (src) => {
    const withImage = { ...product, image: { src, alt: "Front view", width: 1200, height: 1200 } };
    render(<NextIntlClientProvider locale="en" timeZone="UTC">
      <ProductCard product={withImage} locale="en" labels={labels} />
      <ProductPreviewCard product={withImage} locale="en" />
    </NextIntlClientProvider>);

    const images = screen.getAllByRole("img", { name: "Front view" });
    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image).toHaveAttribute("src", src);
      expect(image).not.toHaveAttribute("srcset");
      expect(image).toHaveAttribute("loading", "lazy");
      expect(image).toHaveAttribute("width", "1200");
      expect(image).toHaveAttribute("height", "1200");
    }
  });

  it.each(locales)("preserves %s, category paths and encoded search terms across both pagers", (locale) => {
    const query = "48 V + A&B";
    render(<NextIntlClientProvider locale={locale} timeZone="UTC">
      <Catalog locale={locale} products={[product]} categories={[]} labels={labels}
        query={{ q: query }} currentCategoryPath="power/rectifiers"
        currentPage={3} pageCount={5} totalCount={60} />
    </NextIntlClientProvider>);

    const pagers = screen.getAllByRole("navigation", { name: "pagination" });
    expect(pagers).toHaveLength(2);
    for (const pager of pagers) {
      for (const link of within(pager).getAllByRole("link")) {
        const url = new URL(link.getAttribute("href")!, "https://example.com");
        expect(url.pathname).toBe(`/${locale}/products/category/power/rectifiers`);
        expect(url.searchParams.get("q")).toBe(query);
      }
      expect(within(pager).getByRole("link", { name: "Go to previous page" })).toHaveAttribute("href", `/${locale}/products/category/power/rectifiers?q=48+V+%2B+A%26B&page=2`);
      expect(within(pager).getByRole("link", { name: "Go to next page" })).toHaveAttribute("href", `/${locale}/products/category/power/rectifiers?q=48+V+%2B+A%26B&page=4`);
    }
    expect(within(pagers[1]).getByRole("link", { name: "3", current: "page" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue(query);
  });
});
