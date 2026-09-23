import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewsCategoryFeed, type NewsCategoryOption } from "@/components/editorial/news-category-feed";
import type { EditorialItem } from "@/types/domain";

const { prefetch } = vi.hoisted(() => ({ prefetch: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, locale, prefetch, ...props }: React.ComponentProps<"a"> & { locale?: string; prefetch?: boolean }) => { void prefetch; return <a href={String(href)} lang={locale} {...props}>{children}</a>; },
  useRouter: () => ({ prefetch }),
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

  it("starts with all articles, without the removed intro or search, and switches categories", () => {
    render(<NewsCategoryFeed locale="zh" items={items} categories={categories} detailsLabel="查看详情" emptyLabel="暂无文章" />);

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByText("聚焦技术变化与实际选型")).toBeNull();
    expect(screen.getByText("行业文章")).toBeInTheDocument();
    expect(screen.getByText("选购文章")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "行业文章" })).toHaveAttribute("href", "/news/insight");

    const buyingGuide = within(screen.getByRole("complementary")).getByRole("button", { name: "选购指南" });
    fireEvent.click(buyingGuide);

    expect(buyingGuide).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("选购文章")).toBeInTheDocument();
    expect(screen.queryByText("行业文章")).toBeNull();
  });

  it("keeps every requested category available and provides a recoverable empty state", () => {
    render(<NewsCategoryFeed locale="zh" items={items} categories={categories} detailsLabel="查看详情" emptyLabel="暂无文章" />);

    fireEvent.click(within(screen.getByRole("complementary")).getByRole("button", { name: "教程指南" }));

    expect(screen.getByText("暂无文章")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "教程指南" })).toHaveAttribute("aria-labelledby", "news-list-heading");
    fireEvent.click(screen.getAllByRole("button", { name: "清除筛选" })[0]);
    expect(screen.getByRole("heading", { name: "最新文章" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 篇文章");
  });

  it("shows the actual publication date rather than the last edit date", () => {
    const publishedAt = "2026-09-10T23:30:00.000Z";
    const { container } = render(<NewsCategoryFeed locale="en" items={[{ ...items[0], publishedAt }]} categories={categories} detailsLabel="Read more" emptyLabel="No articles" />);
    expect(container.querySelector("time")).toHaveAttribute("datetime", publishedAt);
    expect(container.querySelector("time")).toHaveTextContent("September 10, 2026");
  });

  it("keeps the three categories only in the reading guide", () => {
    render(<NewsCategoryFeed locale="zh" items={items} categories={categories} detailsLabel="查看详情" emptyLabel="暂无文章" />);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(within(screen.getByRole("complementary")).getAllByRole("button").map((button) => button.textContent)).toEqual(["行业洞察", "选购指南", "教程指南"]);
  });

  it("connects the sidebar guide to the article list and the solution contact route", () => {
    render(<NewsCategoryFeed locale="zh" items={items} categories={categories} detailsLabel="查看详情" emptyLabel="暂无文章" />);
    const panel = screen.getByRole("region", { name: "最新文章" });
    panel.scrollIntoView = vi.fn();
    fireEvent.click(within(screen.getByRole("complementary")).getByRole("button", { name: "选购指南" }));
    expect(panel).toHaveFocus();
    expect(panel.scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "instant" });
    expect(screen.getByRole("heading", { name: "需要定制解决方案？" })).toBeInTheDocument();
    expect(screen.getByText("我们的工程师免费为您确定合适的系统配置。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "联系我们" })).toHaveAttribute("href", "/contact");
  });

  it("makes image, title and right-side action one accessible article link", () => {
    render(<NewsCategoryFeed locale="zh" items={[{ ...items[0], coverImage: { src: "/media/news/cover.webp", alt: "机房现场", width: 1200, height: 800 } }, items[1]]} categories={categories} detailsLabel="查看详情" emptyLabel="暂无文章" />);
    const articleLink = screen.getByRole("link", { name: "行业文章" });
    expect(within(articleLink).getByRole("img", { name: "机房现场" })).toHaveAttribute("loading", "lazy");
    expect(within(articleLink).getByText("查看详情")).toBeInTheDocument();
    expect(articleLink.lastElementChild).toHaveTextContent("查看详情");
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "行业文章" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "选购文章" })).toBeInTheDocument();
  });

  it("prefetches only the article the visitor shows intent to open", () => {
    prefetch.mockClear();
    render(<NewsCategoryFeed locale="zh" items={items} categories={categories} detailsLabel="查看详情" emptyLabel="暂无文章" />);
    const articleLink = screen.getByRole("link", { name: "行业文章" });
    fireEvent.pointerEnter(articleLink);
    fireEvent.focus(articleLink);
    expect(prefetch).toHaveBeenCalledTimes(1);
    expect(prefetch).toHaveBeenCalledWith("/news/insight");
  });
});
