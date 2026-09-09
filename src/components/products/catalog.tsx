import { Fragment } from "react";
import { SearchIcon } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { CategoryTree } from "@/components/products/category-tree";
import { ProductCard } from "@/components/products/product-card";
import { Link } from "@/i18n/navigation";
import type { CategoryView, Locale, ProductView } from "@/types/domain";

type CatalogLabels = { home: string; products: string; searchPlaceholder: string; searchAction: string; category: string; allProducts: string; filters: string; empty: string; emptyHelp: string; clear: string; model: string; details: string; inquiry: string; compare: string; previous: string; next: string; comparison: string };

function paramsHref(basePath: string, search: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => { if (value) params.set(key, value); });
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Catalog({ locale, products, categories, labels, query, currentCategory, currentCategoryPath }: { locale: Locale; products: ProductView[]; categories: CategoryView[]; labels: CatalogLabels; query: { q?: string; page?: string; compare?: string }; currentCategory?: string; currentCategoryPath?: string }) {
  const basePath = currentCategoryPath ? `/products/category/${currentCategoryPath}` : "/products";
  const q = query.q?.trim().toLowerCase() ?? "";
  const selectedIds = (query.compare ?? "").split(",").filter(Boolean).slice(0, 3);
  const categoryKeys = new Set(currentCategory ? [currentCategory] : []); let changed = true;
  while (changed) { changed = false; for (const category of categories) { if (category.parentKey && categoryKeys.has(category.parentKey) && !categoryKeys.has(category.key)) { categoryKeys.add(category.key); changed = true; } } }
  const categoryFiltered = currentCategory ? products.filter((product) => categoryKeys.has(product.categoryKey)) : products;
  const filtered = categoryFiltered.filter((product) => !q || `${product.name} ${product.model}`.toLowerCase().includes(q));
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 12, currentPage * 12);
  const selected = products.filter((product) => selectedIds.includes(product.id));
  const selectedCategory = selected[0]?.categoryKey;
  const categoryByKey = new Map(categories.map((category) => [category.key, category]));
  const categoryTrail: CategoryView[] = [];
  const visited = new Set<string>();
  let trailItem = currentCategory ? categoryByKey.get(currentCategory) : undefined;
  while (trailItem && !visited.has(trailItem.key)) {
    visited.add(trailItem.key);
    categoryTrail.unshift(trailItem);
    trailItem = trailItem.parentKey ? categoryByKey.get(trailItem.parentKey) : undefined;
  }
  return (
    <section className="product-catalog-section">
      <div className="product-catalog-shell grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] xl:gap-8">
        <CategoryTree categories={categories} current={currentCategory} title={labels.category} mobileLabel={labels.filters} allProducts={labels.allProducts} totalCount={products.length} />
        <div className="flex min-w-0 flex-col gap-6">
          <div className="product-catalog-toolbar">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem><BreadcrumbLink render={<Link href="/" />}>{labels.home}</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                {categoryTrail.length ? <BreadcrumbItem><BreadcrumbLink render={<Link href="/products" />}>{labels.products}</BreadcrumbLink></BreadcrumbItem> : <BreadcrumbItem><BreadcrumbPage>{labels.products}</BreadcrumbPage></BreadcrumbItem>}
                {categoryTrail.map((category, index) => <Fragment key={category.key}><BreadcrumbSeparator />{index === categoryTrail.length - 1 ? <BreadcrumbItem><BreadcrumbPage>{category.name}</BreadcrumbPage></BreadcrumbItem> : <BreadcrumbItem><BreadcrumbLink render={<Link href={`/products/category/${category.path}`} />}>{category.name}</BreadcrumbLink></BreadcrumbItem>}</Fragment>)}
              </BreadcrumbList>
            </Breadcrumb>
            <form action={`/${locale}${basePath}`} className="product-filter-bar">
              <FieldGroup className="flex-row gap-2">
                <Field>
                  <FieldLabel className="sr-only" htmlFor="product-query">{labels.searchPlaceholder}</FieldLabel>
                  <Input id="product-query" name="q" defaultValue={query.q} type="search" placeholder={labels.searchPlaceholder} />
                </Field>
                <Button type="submit"><SearchIcon data-icon="inline-start" />{labels.searchAction}</Button>
              </FieldGroup>
              {selectedIds.length ? <input type="hidden" name="compare" value={selectedIds.join(",")} /> : null}
            </form>
          </div>

          {visible.length ? (
            <div className="product-catalog-grid">
              {visible.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                const next = isSelected ? selectedIds.filter((id) => id !== product.id) : [...selectedIds, product.id].slice(0, 3);
                const compareHref = `/${locale}${paramsHref(basePath, { q: query.q, page: String(currentPage), compare: next.join(",") })}`;
                return <ProductCard key={product.id} product={product} locale={locale} selected={isSelected} compareHref={compareHref} compareDisabled={selectedIds.length >= 3 || Boolean(selectedCategory && selectedCategory !== product.categoryKey)} labels={{ details: labels.details, inquiry: labels.inquiry, compare: labels.compare, model: labels.model }} />;
              })}
            </div>
          ) : (
            <Empty className="border bg-white"><EmptyHeader><EmptyTitle>{labels.empty}</EmptyTitle><EmptyDescription>{labels.emptyHelp}</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" nativeButton={false} render={<Link href={basePath} />}>{labels.clear}</Button></EmptyContent></Empty>
          )}

          {selectedIds.length ? <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background/95 p-3 shadow-sm backdrop-blur"><span className="text-sm">{labels.comparison} · {selectedIds.length}/3</span><Button nativeButton={false} render={<Link href={`/products/compare?ids=${selectedIds.join(",")}`} />}>{labels.comparison}</Button></div> : null}
          {pageCount > 1 ? <Pagination><PaginationContent><PaginationItem><PaginationPrevious href={`/${locale}${paramsHref(basePath, { q: query.q, compare: query.compare, page: String(Math.max(1, currentPage - 1)) })}`} text={labels.previous} /></PaginationItem>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <PaginationItem key={item}><PaginationLink href={`/${locale}${paramsHref(basePath, { q: query.q, compare: query.compare, page: String(item) })}`} isActive={item === currentPage}>{item}</PaginationLink></PaginationItem>)}<PaginationItem><PaginationNext href={`/${locale}${paramsHref(basePath, { q: query.q, compare: query.compare, page: String(Math.min(pageCount, currentPage + 1)) })}`} text={labels.next} /></PaginationItem></PaginationContent></Pagination> : null}
        </div>
      </div>
    </section>
  );
}
