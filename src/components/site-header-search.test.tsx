import type { AnchorHTMLAttributes } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

import { SiteHeaderSearch } from "@/components/site-header-search";

const props = {
  brand: <a href="/zh">HEFENGQI</a>,
  navigation: <nav>Navigation</nav>,
  actions: <button type="button">Language</button>,
  locale: "zh",
  searchLabel: "搜索",
  searchPlaceholder: "搜索 hefengqi.com",
  closeLabel: "关闭搜索",
  popularLabel: "热门链接",
  popularLinks: [
    { href: "/products", label: "产品中心" },
    { href: "/solutions", label: "解决方案" },
  ],
};

describe("SiteHeaderSearch", () => {
  afterEach(() => {
    cleanup();
    delete document.documentElement.dataset.siteSearch;
  });

  it("opens in place, keeps the brand, and exposes the mobile popular links", async () => {
    render(<SiteHeaderSearch {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    const form = screen.getByRole("search");
    const input = screen.getByRole("searchbox");

    expect(form).toHaveAttribute("action", "/zh/search");
    expect(form).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByRole("link", { name: "HEFENGQI" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "热门链接" })).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("closes on Escape and an outside pointer press", () => {
    render(<SiteHeaderSearch {...props} />);
    const trigger = screen.getByRole("button", { name: "搜索" });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("search", { hidden: true })).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.getByRole("search", { hidden: true })).toHaveAttribute("aria-hidden", "true");
  });
});
