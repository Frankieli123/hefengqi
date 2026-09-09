import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryTree } from "@/components/products/category-tree";
import type { CategoryView } from "@/types/domain";

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

  it("renders child categories initially and provides dropdown toggles for categories with children", () => {
    render(
      <CategoryTree
        categories={mockCategories}
        title="产品分类"
        mobileLabel="筛选"
        allProducts="全部产品"
        totalCount={25}
      />,
    );

    // Initial state: child categories are rendered
    expect(screen.getAllByText("直流电源系统").length).toBeGreaterThan(0);
    expect(screen.getAllByText("中兴").length).toBeGreaterThan(0);

    // Toggle buttons exist for categories that have children
    const toggleButtons = screen.getAllByRole("button", { name: /收起分类|展开分类/i });
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

    // Find the toggle button for the first category ("电源管理") in desktop tree
    const toggles = screen.getAllByRole("button", { name: "收起分类" });
    const powerToggle = toggles[0];

    // Click toggle to collapse ("缩起来")
    fireEvent.click(powerToggle);

    expect(powerToggle).toHaveAttribute("aria-expanded", "false");
    expect(powerToggle).toHaveAttribute("aria-label", "展开分类");
    expect(powerToggle.querySelector(".is-collapsed")).not.toBeNull();

    // After collapsing "电源管理", child category "直流电源系统" in both desktop and mobile views is hidden/collapsed
    expect(screen.queryByText("直流电源系统")).toBeNull();

    // Click again to expand
    fireEvent.click(powerToggle);
    expect(powerToggle).toHaveAttribute("aria-expanded", "true");
    expect(powerToggle).toHaveAttribute("aria-label", "收起分类");
    expect(powerToggle.querySelector(".is-collapsed")).toBeNull();
    expect(screen.getAllByText("直流电源系统").length).toBeGreaterThan(0);
  });

  it("toggles collapse when clicking a category title with children", () => {
    render(
      <CategoryTree
        categories={mockCategories}
        current="power"
        title="产品分类"
        mobileLabel="筛选"
        allProducts="全部产品"
        totalCount={25}
      />,
    );

    // Initial state: "power" is current and child "直流电源系统" is visible
    expect(screen.getAllByText("直流电源系统").length).toBeGreaterThan(0);

    // Find the category element for "电源管理"
    const powerTitle = screen.getAllByText("电源管理")[0];

    // Clicking category title directly toggles collapse
    fireEvent.click(powerTitle);
    expect(screen.queryByText("直流电源系统")).toBeNull();

    // Clicking it again expands it back
    fireEvent.click(powerTitle);
    expect(screen.getAllByText("直流电源系统").length).toBeGreaterThan(0);
  });
});
