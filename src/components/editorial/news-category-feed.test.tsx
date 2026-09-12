import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewsCategoryFeed, type NewsCategoryOption } from "@/components/editorial/news-category-feed";
import type { EditorialItem } from "@/types/domain";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => <a href={String(href)} {...props}>{children}</a>,
}));

const categories: NewsCategoryOption[] = [
  { value: "ALL", label: "全部" },
  { value: "INDUSTRY_INSIGHTS", label: "行业洞察" },
  { value: "BUYING_GUIDE", label: "选购指南" },
  { value: "TUTORIAL_GUIDE", label: "教程指南" },
];

const items: EditorialItem[] = [
  { id: "insight", slug: "insight", title: "行业文章", summary: "行业文章摘要", body: [], updatedAt: "2026-09-12T00:00:00.000Z", newsCategory: "INDUSTRY_INSIGHTS" },
  { id: "buying", slug: "buying", title: "选购文章", summary: "选购文章摘要", body: [], updatedAt: "2026-09-11T00:00:00.000Z", newsCategory: "BUYING_GUIDE" },
];

describe("NewsCategoryFeed", () => {
  afterEach(cleanup);

  it("shows all articles initially and switches the list when a category is clicked", () => {
    render(<NewsCategoryFeed locale="zh" items={items} categories={categories} detailsLabel="查看详情" navLabel="新闻分类" emptyLabel="暂无文章" introTitle="聚焦技术变化与实际选型" introDescription="新闻栏目说明" />);

    expect(screen.getByRole("tab", { name: "全部" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "聚焦技术变化与实际选型" })).toBeInTheDocument();
    expect(screen.getByText("新闻栏目说明")).toBeInTheDocument();
    expect(screen.getByText("行业文章")).toBeInTheDocument();
    expect(screen.getByText("选购文章")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "选购指南" }));

    expect(screen.getByRole("tab", { name: "选购指南" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("选购文章")).toBeInTheDocument();
    expect(screen.queryByText("行业文章")).toBeNull();
  });

  it("keeps every requested category available and provides an empty state", () => {
    render(<NewsCategoryFeed locale="zh" items={items} categories={categories} detailsLabel="查看详情" navLabel="新闻分类" emptyLabel="暂无文章" introTitle="聚焦技术变化与实际选型" introDescription="新闻栏目说明" />);

    fireEvent.click(screen.getByRole("tab", { name: "教程指南" }));

    expect(screen.getByText("暂无文章")).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "news-category-tutorial_guide");
  });
});
