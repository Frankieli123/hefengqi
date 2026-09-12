"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import {
  CheckIcon,
  ExternalLinkIcon,
  ImageIcon,
  LayersIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { changeProductStatus, setProductPrimaryImage } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type AdminProductItem = {
  id: string;
  model: string;
  sku: string | null;
  origin: string;
  status: "DRAFT" | "READY" | "PUBLISHED" | "ARCHIVED" | "NEEDS_REVIEW";
  viewCount: number;
  updatedAt: string;
  primaryImageId: string | null;
  brand: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    key: string;
    name: string;
    actualName: string;
    rootName?: string | null;
  };
  translations: {
    locale: string;
    name: string;
    slug: string;
  }[];
  media: {
    asset: {
      id: string;
      originalName: string;
      storageKey: string;
      kind: string;
    };
  }[];
};

export function ProductListTable({ products }: { products: AdminProductItem[] }) {
  // Stable product list: maintain current order in local state so items NEVER jump after update
  const [items, setItems] = useState<AdminProductItem[]>(products);

  // Local state for search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Local optimistic state for primary images (productId -> assetId)
  const [primaryImageMap, setPrimaryImageMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const p of products) {
      if (p.primaryImageId) {
        map[p.id] = p.primaryImageId;
      } else if (p.media[0]?.asset?.id) {
        map[p.id] = p.media[0].asset.id;
      }
    }
    return map;
  });

  // Track product id that was just updated to show compact "✓ 已更新" badge inside the fixed 64px box
  const [recentlySwitchedId, setRecentlySwitchedId] = useState<string | null>(null);

  // Compact floating popover state anchored right at the button (no screen takeover, no card stretching)
  const [popoverAnchor, setPopoverAnchor] = useState<{
    productId: string;
    top: number;
    left: number;
  } | null>(null);

  const [, startTransition] = useTransition();

  // Keep items updated when server revalidates, while strictly PRESERVING the existing list order!
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- merge refreshed server data while preserving the user-visible row order
    setItems((prevItems) => {
      const incomingMap = new Map(products.map((p) => [p.id, p]));
      // Iterate over prevItems order so positions are 100% frozen
      const updated = prevItems.map((old) => {
        const fresh = incomingMap.get(old.id);
        if (!fresh) return old;
        return {
          ...fresh,
          primaryImageId: primaryImageMap[old.id] ?? fresh.primaryImageId,
        };
      });
      // Append any genuinely new products that were added
      const existingIds = new Set(prevItems.map((p) => p.id));
      const brandNew = products.filter((p) => !existingIds.has(p.id));
      return brandNew.length ? [...brandNew, ...updated] : updated;
    });
  }, [products, primaryImageMap]);

  // Handle Escape key or outside scroll to close compact popover
  useEffect(() => {
    if (!popoverAnchor) return;
    const handleClose = () => setPopoverAnchor(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopoverAnchor(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, [popoverAnchor]);

  // Restore search query & filters from URL on initial mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q") || params.get("search");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate filters from the current URL once on mount
      if (q) setSearchQuery(q);
      const b = params.get("brand");
      if (b) setSelectedBrand(b);
      const c = params.get("category");
      if (c) setSelectedCategory(c);
      const s = params.get("status");
      if (s) setSelectedStatus(s);
    }
  }, []);

  // Sync filters to URL query string without reloading page
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (searchQuery.trim()) url.searchParams.set("q", searchQuery.trim());
      else {
        url.searchParams.delete("q");
        url.searchParams.delete("search");
      }
      if (selectedBrand !== "ALL") url.searchParams.set("brand", selectedBrand);
      else url.searchParams.delete("brand");
      if (selectedCategory !== "ALL") url.searchParams.set("category", selectedCategory);
      else url.searchParams.delete("category");
      if (selectedStatus !== "ALL") url.searchParams.set("status", selectedStatus);
      else url.searchParams.delete("status");
      window.history.replaceState(null, "", url.toString());
    }
  }, [searchQuery, selectedBrand, selectedCategory, selectedStatus]);

  // Extract unique brands with counts
  const brands = useMemo(() => {
    const brandMap = new Map<string, number>();
    for (const p of items) {
      if (p.brand?.name) {
        brandMap.set(p.brand.name, (brandMap.get(p.brand.name) || 0) + 1);
      }
    }
    return Array.from(brandMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  // Extract unique actual categories with counts
  const actualCategories = useMemo(() => {
    const catMap = new Map<string, number>();
    for (const p of items) {
      const catName = p.category.actualName || p.category.name;
      if (catName) {
        catMap.set(catName, (catMap.get(catName) || 0) + 1);
      }
    }
    return Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedStatus !== "ALL" && item.status !== selectedStatus) {
        return false;
      }
      if (selectedBrand !== "ALL" && item.brand.name !== selectedBrand) {
        return false;
      }
      if (selectedCategory !== "ALL" && item.category.actualName !== selectedCategory) {
        return false;
      }
      if (!query) return true;

      const modelMatch = item.model.toLowerCase().includes(query);
      const skuMatch = item.sku ? item.sku.toLowerCase().includes(query) : false;
      const brandMatch = item.brand.name.toLowerCase().includes(query);
      const catMatch =
        item.category.actualName.toLowerCase().includes(query) ||
        (item.category.rootName ? item.category.rootName.toLowerCase().includes(query) : false) ||
        item.category.name.toLowerCase().includes(query);
      const translationMatch = item.translations.some(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.slug.toLowerCase().includes(query)
      );

      return modelMatch || skuMatch || brandMatch || catMatch || translationMatch;
    });
  }, [items, searchQuery, selectedBrand, selectedCategory, selectedStatus]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedBrand !== "ALL" ||
    selectedCategory !== "ALL" ||
    selectedStatus !== "ALL";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedBrand("ALL");
    setSelectedCategory("ALL");
    setSelectedStatus("ALL");
  };

  // Toggle compact popover right at the button location
  const handleTogglePopover = (
    e: React.MouseEvent<HTMLElement>,
    productId: string
  ) => {
    e.stopPropagation();
    if (popoverAnchor?.productId === productId) {
      setPopoverAnchor(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 270;
    let left = rect.right - width;
    if (left < 12) left = 12;
    let top = rect.bottom + 6;
    // If too close to bottom of viewport, flip upwards
    if (top + 240 > window.innerHeight) {
      top = Math.max(12, rect.top - 246);
    }
    setPopoverAnchor({ productId, top, left });
  };

  // Instant switch primary image handler with zero scroll jump and zero height shift
  const handleSelectPrimaryImage = (
    productId: string,
    asset: { id: string; originalName: string }
  ) => {
    const previousId = primaryImageMap[productId];
    if (previousId === asset.id) return; // already primary, do nothing

    // Capture exact scroll position before action
    const currentScrollY = typeof window !== "undefined" ? window.scrollY : 0;

    // Optimistically update
    setPrimaryImageMap((prev) => ({ ...prev, [productId]: asset.id }));
    setItems((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, primaryImageId: asset.id } : p))
    );

    // Show temporary compact confirmation inside the fixed 64px box (no row height change!)
    setRecentlySwitchedId(productId);
    setTimeout(() => {
      setRecentlySwitchedId((cur) => (cur === productId ? null : cur));
    }, 2200);

    startTransition(async () => {
      try {
        await setProductPrimaryImage(productId, asset.id);
      } catch {
        // Revert on failure
        setPrimaryImageMap((prev) => ({ ...prev, [productId]: previousId }));
        setItems((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, primaryImageId: previousId } : p))
        );
      } finally {
        // Guarantee zero scroll jump
        if (typeof window !== "undefined" && window.scrollY !== currentScrollY) {
          window.scrollTo({ top: currentScrollY, behavior: "instant" });
        }
      }
    });
  };

  // The active product currently selected for the compact popover
  const popoverProduct = useMemo(
    () => (popoverAnchor ? items.find((p) => p.id === popoverAnchor.productId) : null),
    [popoverAnchor, items]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索型号 (如 R4850G2)、产品名、品牌、分类..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchQuery("");
              }}
              className="pl-9 pr-8 h-9 text-xs"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="清空搜索"
              >
                <XIcon className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* Actual Category Filter */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="category-filter"
              className="text-xs font-medium text-muted-foreground whitespace-nowrap"
            >
              分类:
            </label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">全部分类 ({items.length})</option>
              {actualCategories.map(([catName, count]) => (
                <option key={catName} value={catName}>
                  {catName} ({count})
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="brand-filter"
              className="text-xs font-medium text-muted-foreground whitespace-nowrap"
            >
              品牌:
            </label>
            <select
              id="brand-filter"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">全部品牌 ({items.length})</option>
              {brands.map(([brand, count]) => (
                <option key={brand} value={brand}>
                  {brand} ({count})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="status-filter"
              className="text-xs font-medium text-muted-foreground whitespace-nowrap"
            >
              状态:
            </label>
            <select
              id="status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">全部状态</option>
              <option value="PUBLISHED">已上架 (PUBLISHED)</option>
              <option value="DRAFT">草稿 (DRAFT)</option>
              <option value="NEEDS_REVIEW">待审核 (NEEDS_REVIEW)</option>
              <option value="ARCHIVED">已归档 (ARCHIVED)</option>
            </select>
          </div>
        </div>

        {/* Counts and reset */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground justify-between sm:justify-end shrink-0">
          <span>
            共 <strong className="font-mono text-foreground">{items.length}</strong> 个产品
            {hasActiveFilters ? (
              <>
                ，匹配出 <strong className="font-mono text-primary">{filteredProducts.length}</strong> 个
              </>
            ) : null}
          </span>
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 text-xs text-muted-foreground hover:text-foreground px-2"
            >
              重置筛选
            </Button>
          ) : null}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-lg border bg-card overflow-x-auto shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[210px]">主图 / 快速切换 (点击直切)</TableHead>
              <TableHead className="min-w-[180px]">型号 / 中文名称</TableHead>
              <TableHead className="w-[90px]">品牌</TableHead>
              <TableHead className="w-[130px]">实际分类</TableHead>
              <TableHead className="w-[70px] text-right">浏览量</TableHead>
              <TableHead className="w-[80px]">状态</TableHead>
              <TableHead className="w-[120px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-44 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <SearchIcon className="size-8 opacity-40" />
                    <p className="text-sm font-medium">未找到符合条件的产品</p>
                    <p className="text-xs text-muted-foreground">
                      尝试更换关键词或清除筛选。
                    </p>
                    {hasActiveFilters ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        className="mt-2"
                      >
                        清空筛选条件
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const currentPrimaryId = primaryImageMap[product.id] || product.primaryImageId;
                const primaryMedia =
                  product.media.find((m) => m.asset.id === currentPrimaryId) ??
                  product.media[0];
                const isThisPopoverOpen = popoverAnchor?.productId === product.id;
                const isRecentlySwitched = recentlySwitchedId === product.id;
                const zhTranslation = product.translations[0];

                return (
                  <TableRow key={product.id} className="group hover:bg-muted/30 transition-colors">
                    {/* Primary Image & Switcher Column (Strict zero height shift) */}
                    <TableCell className="align-top py-3.5">
                      <div className="flex items-start gap-2.5">
                        {/* Fixed 64px Primary Thumbnail Box: feedback badge is inside, zero row height shift */}
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border/80 bg-muted/40 shadow-2xs">
                          {primaryMedia ? (
                            <Image
                              src={`/media/${primaryMedia.asset.storageKey}`}
                              alt={primaryMedia.asset.originalName}
                              width={128}
                              height={128}
                              className="size-full object-contain p-0.5"
                              priority={false}
                            />
                          ) : (
                            <div className="grid size-full place-items-center text-muted-foreground/40">
                              <ImageIcon className="size-6" />
                            </div>
                          )}
                          <span
                            className={cn(
                              "absolute bottom-0 inset-x-0 py-0.5 text-center text-[9px] font-semibold leading-none text-white tracking-wider transition-colors",
                              isRecentlySwitched
                                ? "bg-emerald-600 animate-in fade-in duration-150"
                                : "bg-primary/90"
                            )}
                          >
                            {isRecentlySwitched ? "✓ 已切换" : "当前主图"}
                          </span>
                        </div>

                        {/* Interactive Thumbnail Strip (Fixed height, no injected text lines!) */}
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          {product.media.length > 1 ? (
                            <>
                              <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
                                <span className="font-medium">
                                  共 {product.media.length} 张素材
                                </span>
                                {/* Anchored popover trigger: opens right at this button! */}
                                <button
                                  type="button"
                                  onClick={(e) => handleTogglePopover(e, product.id)}
                                  className={cn(
                                    "inline-flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer",
                                    isThisPopoverOpen
                                      ? "text-primary underline"
                                      : "text-primary hover:underline"
                                  )}
                                  title="展开全部素材并在原位置切换"
                                >
                                  <LayersIcon className="size-3" />
                                  {isThisPopoverOpen ? "收起" : "展开全部"}
                                </button>
                              </div>

                              {/* Clickable Image Strip (one-click instant switch, no disabled attribute to prevent browser focus scroll jumps) */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {product.media.slice(0, 5).map(({ asset }) => {
                                  const isCurrent = asset.id === currentPrimaryId;
                                  return (
                                    <button
                                      key={asset.id}
                                      type="button"
                                      onClick={() => handleSelectPrimaryImage(product.id, asset)}
                                      title={
                                        isCurrent
                                          ? `当前主图: ${asset.originalName}`
                                          : `点击立即设为主图: ${asset.originalName}`
                                      }
                                      className={cn(
                                        "relative size-8 shrink-0 overflow-hidden rounded-md border transition-all cursor-pointer",
                                        isCurrent
                                          ? "border-primary ring-2 ring-primary/40 bg-primary/10 shadow-xs"
                                          : "border-border/80 hover:border-primary hover:scale-110 opacity-75 hover:opacity-100 hover:shadow-xs"
                                      )}
                                      aria-pressed={isCurrent}
                                    >
                                      <Image
                                        src={`/media/${asset.storageKey}`}
                                        alt={asset.originalName}
                                        width={64}
                                        height={64}
                                        className="size-full object-contain p-0.5"
                                      />
                                      {isCurrent ? (
                                        <span className="absolute inset-0 grid place-items-center bg-primary/20">
                                          <CheckIcon className="size-3 text-primary stroke-[3]" />
                                        </span>
                                      ) : null}
                                    </button>
                                  );
                                })}

                                {product.media.length > 5 ? (
                                  <button
                                    type="button"
                                    onClick={(e) => handleTogglePopover(e, product.id)}
                                    className="grid size-8 place-items-center rounded-md border border-dashed text-[10px] font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                    title={`还有 ${product.media.length - 5} 张图片，点击在原位置展开`}
                                  >
                                    +{product.media.length - 5}
                                  </button>
                                ) : null}
                              </div>
                            </>
                          ) : product.media.length === 1 ? (
                            <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                              <span>已设唯一主图</span>
                              <a
                                href={`/admin/products/${product.id}`}
                                className="text-[10px] text-primary hover:underline"
                              >
                                + 上传更多素材
                              </a>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                              <span className="text-amber-600 dark:text-amber-400">暂无图片</span>
                              <a
                                href={`/admin/products/${product.id}`}
                                className="text-[10px] text-primary hover:underline font-medium"
                              >
                                + 前往上传
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Model & Name */}
                    <TableCell className="align-top py-3.5">
                      <div className="flex flex-col gap-1">
                        <a
                          className="font-medium text-foreground hover:text-primary hover:underline"
                          href={`/admin/products/${product.id}`}
                        >
                          {product.model}
                        </a>
                        <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {zhTranslation?.name ?? "缺少中文名称"}
                        </span>
                        {product.sku ? (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            SKU: {product.sku}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>

                    {/* Brand */}
                    <TableCell className="align-top py-3.5">
                      <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                        {product.brand.name}
                      </span>
                    </TableCell>

                    {/* Actual Category (NOT brand leaf!) */}
                    <TableCell className="align-top py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-xs text-foreground">
                          {product.category.actualName}
                        </span>
                        {product.category.rootName && product.category.rootName !== product.category.actualName ? (
                          <span className="text-[10px] text-muted-foreground">
                            {product.category.rootName}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>

                    {/* View Count */}
                    <TableCell className="align-top py-3.5 text-right">
                      <span className="font-mono text-sm font-medium">
                        {product.viewCount}
                      </span>
                    </TableCell>



                    {/* Status */}
                    <TableCell className="align-top py-3.5">
                      <Badge
                        variant={
                          product.status === "PUBLISHED"
                            ? "default"
                            : product.status === "NEEDS_REVIEW"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px] font-medium"
                      >
                        {product.status === "PUBLISHED"
                          ? "已上架"
                          : product.status === "DRAFT"
                          ? "草稿"
                          : product.status === "NEEDS_REVIEW"
                          ? "待审核"
                          : "已归档"}
                      </Badge>
                    </TableCell>



                    {/* Actions */}
                    <TableCell className="align-top py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          render={<a href={`/admin/products/${product.id}`} />}
                          className="h-7 px-2.5 text-xs font-medium"
                        >
                          编辑
                        </Button>

                        {zhTranslation?.slug && product.status === "PUBLISHED" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            render={
                              <a
                                href={`/zh/products/${zhTranslation.slug}`}
                                target="_blank"
                                rel="noreferrer"
                              />
                            }
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            title="在前台新标签打开详情页"
                          >
                            <ExternalLinkIcon className="size-3.5" />
                          </Button>
                        ) : null}

                        {product.status !== "PUBLISHED" ? (
                          <form action={changeProductStatus}>
                            <input type="hidden" name="productId" value={product.id} />
                            <input type="hidden" name="status" value="PUBLISHED" />
                            <Button
                              variant="default"
                              size="sm"
                              type="submit"
                              className="h-7 px-2.5 text-xs"
                            >
                              上架
                            </Button>
                          </form>
                        ) : (
                          <form action={changeProductStatus}>
                            <input type="hidden" name="productId" value={product.id} />
                            <input type="hidden" name="status" value="ARCHIVED" />
                            <Button
                              variant="ghost"
                              size="sm"
                              type="submit"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            >
                              下架
                            </Button>
                          </form>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Lightweight Popover anchored right at "展开全部" button (Zero card stretch, minimal footprint) */}
      {popoverAnchor && popoverProduct ? (
        <>
          {/* Transparent click-outside backdrop */}
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setPopoverAnchor(null)}
          />

          {/* Anchored popover card right under the trigger button */}
          <div
            style={{
              top: `${popoverAnchor.top}px`,
              left: `${popoverAnchor.left}px`,
            }}
            className="fixed z-50 w-[275px] rounded-lg border bg-popover p-2.5 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b pb-1.5 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-foreground">
                  全部素材图
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  ({popoverProduct.media.length} 张)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPopoverAnchor(null)}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                title="关闭"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground mb-2">
              点击任意图片直接设为该商品主图：
            </p>

            {/* Compact Image Grid */}
            <div className="grid grid-cols-4 gap-1.5 max-h-[220px] overflow-y-auto pr-0.5">
              {popoverProduct.media.map(({ asset }) => {
                const isCurrent =
                  asset.id ===
                  (primaryImageMap[popoverProduct.id] || popoverProduct.primaryImageId);

                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleSelectPrimaryImage(popoverProduct.id, asset)}
                    className={cn(
                      "group relative flex flex-col items-center rounded-md border p-1 text-center transition-all text-left cursor-pointer",
                      isCurrent
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border hover:border-primary hover:bg-muted/70"
                    )}
                    title={
                      isCurrent
                        ? `当前主图: ${asset.originalName}`
                        : `点击设为主图: ${asset.originalName}`
                    }
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded bg-muted/40">
                      <Image
                        src={`/media/${asset.storageKey}`}
                        alt={asset.originalName}
                        width={64}
                        height={64}
                        className="size-full object-contain p-0.5"
                      />
                      {isCurrent ? (
                        <span className="absolute bottom-0 inset-x-0 bg-primary py-0.2 text-center text-[8px] font-bold text-white leading-tight">
                          当前
                        </span>
                      ) : null}
                    </div>
                    <span
                      className="mt-1 w-full truncate text-[9px] text-muted-foreground group-hover:text-foreground text-center"
                      title={asset.originalName}
                    >
                      {asset.originalName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
