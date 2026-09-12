"use client";

import { useCallback, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronDownIcon, ChevronRightIcon, SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import type { CategoryView } from "@/types/domain";
import { cn } from "@/lib/utils";

function CategoryBranch({
  categories,
  current,
  activePath,
  parentKey,
  depth = 0,
  collapsedKeys,
  onToggle,
}: {
  categories: CategoryView[];
  current?: string;
  activePath: Set<string>;
  parentKey?: string;
  depth?: number;
  collapsedKeys: Set<string>;
  onToggle: (key: string) => void;
}) {
  const locale = useLocale();
  const children = categories.filter((category) => category.parentKey === parentKey);
  if (!children.length) return null;

  return (
    <ul className={cn("product-category-list", depth > 0 && "product-category-children")}>
      {children.map((category) => {
        const active = category.key === current;
        const hasChildren = categories.some((item) => item.parentKey === category.key);
        const isCollapsed = collapsedKeys.has(category.key);

        return (
          <li key={category.key} className="product-category-item">
            <div
              className={cn(
                "product-category-row",
                `product-category-level-${Math.min(depth, 2)}`,
                active && "is-active",
                !active && activePath.has(category.key) && "is-ancestor",
              )}
            >
              <Link
                href={`/products/category/${category.path}`}
                className={cn("product-category-link", hasChildren && "product-category-parent-title")}
                aria-current={active ? "page" : undefined}
              >
                <span>{category.name}</span>
              </Link>
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={`${isCollapsed ? (locale === "ru" ? "Развернуть " : locale === "zh" ? "展开" : "Expand ") : (locale === "ru" ? "Свернуть " : locale === "zh" ? "收起" : "Collapse ")}${category.name}`}
                  aria-expanded={!isCollapsed}
                  className="product-category-toggle"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggle(category.key);
                  }}
                >
                  <ChevronDownIcon className={cn("product-category-chevron", isCollapsed && "is-collapsed")} aria-hidden />
                </button>
              ) : null}
            </div>
            {hasChildren && !isCollapsed ? (
              <CategoryBranch
                categories={categories}
                current={current}
                activePath={activePath}
                parentKey={category.key}
                depth={depth + 1}
                collapsedKeys={collapsedKeys}
                onToggle={onToggle}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Tree({
  categories,
  current,
  allProducts,
  collapsedKeys,
  onToggle,
}: {
  categories: CategoryView[];
  current?: string;
  allProducts: string;
  collapsedKeys: Set<string>;
  onToggle: (key: string) => void;
}) {
  const byKey = new Map(categories.map((category) => [category.key, category]));
  const activePath = new Set<string>();
  let activeCategory = current ? byKey.get(current) : undefined;
  while (activeCategory && !activePath.has(activeCategory.key)) {
    activePath.add(activeCategory.key);
    activeCategory = activeCategory.parentKey ? byKey.get(activeCategory.parentKey) : undefined;
  }

  return (
    <nav aria-label={allProducts}>
      <div className={cn("product-category-row product-category-all", !current && "is-active")}>
        <Link href="/products" className="product-category-link" aria-current={!current ? "page" : undefined}>
          <span>{allProducts}</span>
        </Link>
      </div>
      <CategoryBranch
        categories={categories}
        current={current}
        activePath={activePath}
        collapsedKeys={collapsedKeys}
        onToggle={onToggle}
      />
    </nav>
  );
}


function CustomSolutionCard({
  solution,
  className,
}: {
  solution: { title: string; description: string; action: string };
  className?: string;
}) {
  return (
    <div className={cn("product-custom-solution-card", className)}>
      <h3 className="product-custom-solution-title">{solution.title}</h3>
      <p className="product-custom-solution-desc">{solution.description}</p>
      <Button
        nativeButton={false}
        render={<Link href="/contact" />}
        className="product-custom-solution-btn"
      >
        <span>{solution.action}</span>
      </Button>
    </div>
  );
}

export function CategoryTree({
  categories,
  current,
  title,
  mobileLabel,
  allProducts,
  customSolution,
}: {
  categories: CategoryView[];
  current?: string;
  title: string;
  mobileLabel: string;
  allProducts: string;
  totalCount?: number;
  customSolution?: {
    title: string;
    description: string;
    action: string;
  };
}) {
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(() => {
    const byKey = new Map(categories.map((category) => [category.key, category]));
    const activePath = new Set<string>();
    let active = current ? byKey.get(current) : undefined;
    while (active && !activePath.has(active.key)) {
      activePath.add(active.key);
      active = active.parentKey ? byKey.get(active.parentKey) : undefined;
    }
    return new Set(categories
      .filter((category) => category.level === 2 && !activePath.has(category.key) && categories.some((item) => item.parentKey === category.key))
      .map((category) => category.key));
  });

  const handleToggle = useCallback((key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const currentLabel = categories.find((category) => category.key === current)?.name ?? allProducts;
  return (
    <>
      <div className="product-category-sidebar hidden lg:flex lg:flex-col lg:gap-4 self-start">
        <aside className="product-category-panel w-full">
          <div className="product-category-heading">
            <h2>{title}</h2>
          </div>
          <div className="product-category-scroll">
            <Tree
              categories={categories}
              current={current}
              allProducts={allProducts}
              collapsedKeys={collapsedKeys}
              onToggle={handleToggle}
            />
          </div>
        </aside>
        {customSolution ? (
          <CustomSolutionCard solution={customSolution} />
        ) : null}
      </div>
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" className="h-11 w-full justify-between rounded-sm bg-white px-4" />}>
            <span className="flex min-w-0 items-center gap-2"><SlidersHorizontalIcon aria-hidden /><span className="truncate">{mobileLabel}: {currentLabel}</span></span>
            <ChevronRightIcon aria-hidden />
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(90vw,23rem)] p-0">
            <SheetHeader className="border-b px-5 py-5">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{currentLabel}</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto px-4 pb-8 pt-3">
              <Tree
                categories={categories}
                current={current}
                allProducts={allProducts}
                collapsedKeys={collapsedKeys}
                onToggle={handleToggle}
              />
              {customSolution ? (
                <CustomSolutionCard solution={customSolution} className="mt-6 mb-2" />
              ) : null}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
