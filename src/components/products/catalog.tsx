import { Fragment } from "react";
import { ArrowRightIcon, SearchIcon } from "lucide-react";
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
import type { CategoryView, Locale, ProductListView } from "@/types/domain";

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

export function Catalog({ locale, products, categories, labels, query, currentCategory, currentCategoryPath, currentPage, pageCount, totalCount }: { locale: Locale; products: ProductListView[]; categories: CategoryView[]; labels: CatalogLabels; query: { q?: string; page?: string }; currentCategory?: string; currentCategoryPath?: string; currentPage: number; pageCount: number; totalCount: number }) {
  const basePath = currentCategoryPath ? `/products/category/${currentCategoryPath}` : "/products";
  const hasQuery = Boolean(query.q?.trim());
  const paginationEntries = getPaginationEntries(currentPage, pageCount);
  const visible = products;
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
    <>
      <section className="product-catalog-section">
        <div className="product-catalog-shell grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] xl:gap-8">
        <CategoryTree
          categories={categories}
          current={currentCategory}
          title={labels.category}
          mobileLabel={labels.filters}
          allProducts={labels.allProducts}
          totalCount={totalCount}
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
            <Empty className="border bg-white"><EmptyHeader><EmptyTitle>{labels.empty}</EmptyTitle><EmptyDescription>{labels.emptyHelp}</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" nativeButton={false} render={<Link href={hasQuery ? "/products" : basePath} />}>{labels.clear}</Button></EmptyContent></Empty>
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
      {labels.customSolutionTitle ? (
        <section className="bg-primary text-primary-foreground">
          <div className="page-shell flex flex-col items-start justify-between gap-8 py-14 md:flex-row md:items-center">
            <div className="flex max-w-3xl flex-col gap-3">
              <h2 className="text-2xl font-semibold leading-snug text-balance md:text-3xl">{labels.customSolutionTitle}</h2>
              <p className="leading-7 opacity-85">{labels.customSolutionDesc}</p>
            </div>
            <Button size="lg" variant="secondary" nativeButton={false} render={<Link locale={locale} href="/contact" />}>
              {labels.customSolutionCta ?? labels.inquiry}
              <ArrowRightIcon data-icon="inline-end" aria-hidden />
            </Button>
          </div>
        </section>
      ) : null}
    </>
  );
}
