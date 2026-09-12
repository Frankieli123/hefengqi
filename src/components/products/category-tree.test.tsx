import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryTree } from "@/components/products/category-tree";
import type { CategoryView } from "@/types/domain";

vi.mock("next-intl", () => ({ useLocale: () => "zh" }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

const mockCategories: CategoryView[] = [
  {
    id: "cat-1",
    key: "power",
    slug: "power",
    path: "power",
    name: "电源管理",
    description: "电源管理系统",
    level: 1,
    count: 12,
  },
  {
    id: "cat-2",
    key: "dc-power-systems",
    slug: "dc-power-systems",
    path: "power/dc-power-systems",
    name: "直流电源系统",
    description: "直流电源系统",
    parentKey: "power",
    level: 2,
    count: 8,
  },
  {
    id: "cat-3",
    key: "zte",
    slug: "zte",
    path: "power/dc-power-systems/zte",
    name: "中兴",
    description: "中兴直流电源",
    parentKey: "dc-power-systems",
    level: 3,
    count: 3,
  },
  {
    id: "cat-4",
    key: "thermal-management",
    slug: "thermal-management",
    path: "thermal-management",
    name: "热管理",
    description: "热管理系统",
    level: 1,
    count: 5,
  },
];

describe("CategoryTree", () => {
  afterEach(() => {
    cleanup();
  });
  it("does not display category count numbers anywhere in the category tree", () => {
    const { container } = render(
      <CategoryTree
        categories={mockCategories}
        title="产品分类"
        mobileLabel="筛选"
        allProducts="全部产品"
        totalCount={25}
      />,
    );

    expect(container.querySelector(".product-category-count")).toBeNull();
    expect(screen.queryByText("25")).toBeNull();
    expect(screen.queryByText("12")).toBeNull();
    expect(screen.queryByText("8")).toBeNull();
    expect(screen.queryByText("3")).toBeNull();
    expect(screen.queryByText("5")).toBeNull();
  });

  it("shows product types but keeps third-level brands compact initially", () => {
    render(
      <CategoryTree
        categories={mockCategories}
        title="产品分类"
        mobileLabel="筛选"
        allProducts="全部产品"
        totalCount={25}
      />,
    );

    // Level-two product types stay visible; their brand lists start collapsed.
    expect(screen.getAllByText("直流电源系统").length).toBeGreaterThan(0);
    expect(screen.queryByText("中兴")).toBeNull();

    const toggleButtons = screen.getAllByRole("button", { name: /收起|展开/i });
    expect(toggleButtons.length).toBeGreaterThan(0);
  });

  it("collapses child categories when the dropdown toggle is clicked, and expands when clicked again", () => {
    render(
      <CategoryTree
        categories={mockCategories}
        title="产品分类"
        mobileLabel="筛选"
        allProducts="全部产品"
        totalCount={25}
      />,
    );

    const powerToggle = screen.getAllByRole("button", { name: "收起电源管理" })[0];

    // Click toggle to collapse ("缩起来")
    fireEvent.click(powerToggle);

    expect(powerToggle).toHaveAttribute("aria-expanded", "false");
    expect(powerToggle).toHaveAttribute("aria-label", "展开电源管理");
    expect(powerToggle.querySelector(".is-collapsed")).not.toBeNull();

    // After collapsing "电源管理", child category "直流电源系统" in both desktop and mobile views is hidden/collapsed
    expect(screen.queryByText("直流电源系统")).toBeNull();

    // Click again to expand
    fireEvent.click(powerToggle);
    expect(powerToggle).toHaveAttribute("aria-expanded", "true");
    expect(powerToggle).toHaveAttribute("aria-label", "收起电源管理");
    expect(powerToggle.querySelector(".is-collapsed")).toBeNull();
    expect(screen.getAllByText("直流电源系统").length).toBeGreaterThan(0);
  });

  it("keeps parent category titles navigable and uses the chevron to expand brands", () => {
    render(
      <CategoryTree
        categories={mockCategories}
        title="产品分类"
        mobileLabel="筛选"
        allProducts="全部产品"
        totalCount={25}
      />,
    );

    expect(screen.getAllByText("直流电源系统").length).toBeGreaterThan(0);
    expect(screen.queryByText("中兴")).toBeNull();

    const typeLink = screen.getAllByRole("link", { name: "直流电源系统" })[0];
    expect(typeLink).toHaveAttribute("href", "/products/category/power/dc-power-systems");

    const typeToggle = screen.getAllByRole("button", { name: "展开直流电源系统" })[0];
    fireEvent.click(typeToggle);
    expect(screen.getAllByText("中兴").length).toBeGreaterThan(0);
  });
  it("renders custom solution card below product categories with contact button", () => {
    render(
      <CategoryTree
        categories={mockCategories}
        title="产品分类"
        mobileLabel="筛选"
        allProducts="全部产品"
        totalCount={25}
        customSolution={{
          title: "需要定制解决方案？",
          description: "我们的工程师免费为您确定合适的系统配置。",
          action: "联系我们",
        }}
      />,
    );

    expect(screen.getAllByText("需要定制解决方案？").length).toBeGreaterThan(0);
    expect(screen.getAllByText("我们的工程师免费为您确定合适的系统配置。").length).toBeGreaterThan(0);
    const contactBtn = screen.getByText("联系我们").closest("a");
    expect(contactBtn).not.toBeNull();
    expect(contactBtn).toHaveAttribute("href", "/contact");
  });
});
