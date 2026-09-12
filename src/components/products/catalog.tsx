import { Fragment } from "react";
import { SearchIcon } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { CategoryTree } from "@/components/products/category-tree";
import { ProductCard } from "@/components/products/product-card";
import { Link } from "@/i18n/navigation";
import { getPaginationEntries } from "@/lib/pagination";
import type { CategoryView, Locale, ProductView } from "@/types/domain";

type CatalogLabels = {
  home: string;
  products: string;
  searchPlaceholder: string;
  searchAction: string;
  category: string;
  allProducts: string;
  filters: string;
  empty: string;
  emptyHelp: string;
  clear: string;
  model: string;
  details: string;
  inquiry: string;
  previous: string;
  next: string;
  customSolutionTitle?: string;
  customSolutionDesc?: string;
  customSolutionCta?: string;
};

function paramsHref(basePath: string, search: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => { if (value) params.set(key, value); });
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function matchesProductQuery(product: ProductView, query: string): boolean {
  if (!query) return true;
  const rawTerms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (rawTerms.length === 0) return true;

  const attrText = (product.attributes ?? []).map((a) => `${a.label} ${a.value} ${a.unit ?? ""}`).join(" ");
  const rawString = [
    product.name,
    product.model,
    product.brand,
    product.categoryName,
    product.sku,
    product.shortDescription,
    product.directDefinition,
    attrText,
  ].filter(Boolean).join(" ").toLowerCase();

  const normalizedString = rawString.replace(/[-_/:,.\s]/g, "");

  return rawTerms.every((term) => {
    if (rawString.includes(term)) return true;
    const cleanTerm = term.replace(/[-_/:,.\s]/g, "");
    return Boolean(cleanTerm && normalizedString.includes(cleanTerm));
  });
}

export function Catalog({ locale, products, categories, labels, query, currentCategory, currentCategoryPath }: { locale: Locale; products: ProductView[]; categories: CategoryView[]; labels: CatalogLabels; query: { q?: string; page?: string }; currentCategory?: string; currentCategoryPath?: string }) {
  const basePath = currentCategoryPath ? `/products/category/${currentCategoryPath}` : "/products";
  const q = query.q?.trim().toLowerCase() ?? "";
  const categoryKeys = new Set(currentCategory ? [currentCategory] : []); let changed = true;
  while (changed) { changed = false; for (const category of categories) { if (category.parentKey && categoryKeys.has(category.parentKey) && !categoryKeys.has(category.key)) { categoryKeys.add(category.key); changed = true; } } }
  // When searching with a query, search all products across all categories
  const pool = (currentCategory && !q)
    ? products.filter((product) => categoryKeys.has(product.categoryKey))
    : products;
  const filtered = pool.filter((product) => matchesProductQuery(product, q));
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pageCount);
  const paginationEntries = getPaginationEntries(currentPage, pageCount);
  const visible = filtered.slice((currentPage - 1) * 12, currentPage * 12);
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
        <CategoryTree
          categories={categories}
          current={currentCategory}
          title={labels.category}
          mobileLabel={labels.filters}
          allProducts={labels.allProducts}
          totalCount={products.length}
          customSolution={
            labels.customSolutionTitle
              ? {
                  title: labels.customSolutionTitle,
                  description: labels.customSolutionDesc ?? "",
                  action: labels.customSolutionCta ?? labels.inquiry,
                }
              : undefined
          }
        />
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
            <form action={`/${locale}/products`} className="product-filter-bar">
              <FieldGroup className="flex-row gap-2">
                <Field>
                  <FieldLabel className="sr-only" htmlFor="product-query">{labels.searchPlaceholder}</FieldLabel>
                  <Input id="product-query" name="q" defaultValue={query.q} type="search" placeholder={labels.searchPlaceholder} />
                </Field>
                <Button type="submit"><SearchIcon data-icon="inline-start" />{labels.searchAction}</Button>
              </FieldGroup>
            </form>
          </div>

          {visible.length ? (
            <div className="product-catalog-grid">
              {visible.map((product) => <ProductCard key={product.id} product={product} locale={locale} labels={{ details: labels.details, inquiry: labels.inquiry, model: labels.model }} />)}
            </div>
          ) : (
            <Empty className="border bg-white"><EmptyHeader><EmptyTitle>{labels.empty}</EmptyTitle><EmptyDescription>{labels.emptyHelp}</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" nativeButton={false} render={<Link href={q ? "/products" : basePath} />}>{labels.clear}</Button></EmptyContent></Empty>
          )}

          {pageCount > 1 ? (
            <div className="product-pagination">
              <Pagination className="product-pagination-mobile">
                <PaginationContent>
                  <PaginationItem><PaginationPrevious href={`/${locale}${paramsHref(basePath, { q: query.q, page: String(Math.max(1, currentPage - 1)) })}`} text={labels.previous} /></PaginationItem>
                  <PaginationItem><span className="product-pagination-status" aria-current="page">{currentPage} / {pageCount}</span></PaginationItem>
                  <PaginationItem><PaginationNext href={`/${locale}${paramsHref(basePath, { q: query.q, page: String(Math.min(pageCount, currentPage + 1)) })}`} text={labels.next} /></PaginationItem>
                </PaginationContent>
              </Pagination>
              <Pagination className="product-pagination-desktop">
                <PaginationContent>
                  <PaginationItem><PaginationPrevious href={`/${locale}${paramsHref(basePath, { q: query.q, page: String(Math.max(1, currentPage - 1)) })}`} text={labels.previous} /></PaginationItem>
                  {paginationEntries.map((entry) => typeof entry === "number" ? (
                    <PaginationItem key={entry}><PaginationLink href={`/${locale}${paramsHref(basePath, { q: query.q, page: String(entry) })}`} isActive={entry === currentPage}>{entry}</PaginationLink></PaginationItem>
                  ) : (
                    <PaginationItem key={entry}><PaginationEllipsis /></PaginationItem>
                  ))}
                  <PaginationItem><PaginationNext href={`/${locale}${paramsHref(basePath, { q: query.q, page: String(Math.min(pageCount, currentPage + 1)) })}`} text={labels.next} /></PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
