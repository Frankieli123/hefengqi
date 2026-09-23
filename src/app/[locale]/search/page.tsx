import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRightIcon, BoxesIcon, FileTextIcon, SearchIcon } from "lucide-react";
import { EditorialPageHeader } from "@/components/editorial/editorial-page-header";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { formatBrandName } from "@/lib/brand";
import { getEditorialSummaries, getProductCatalogPage } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";
import type { EditorialItem, Locale, ProductListView } from "@/types/domain";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[]; filter?: string | string[] }>;
};

type SearchFilter = "all" | SearchResult["type"];

type SearchResult = {
  id: string;
  title: string;
  summary: string;
  href: string;
  type: "product" | "solution" | "case" | "news";
  model?: string;
  brand?: string;
  category?: string;
  updatedAt?: string;
  image?: ProductListView["image"];
};

function queryValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value ?? "").trim().slice(0, 120);
}

function filterValue(value: string | string[] | undefined): SearchFilter {
  const valueString = Array.isArray(value) ? value[0] : value;
  return valueString === "product" || valueString === "solution" || valueString === "case" || valueString === "news" ? valueString : "all";
}

function editorialMatches(item: EditorialItem, needle: string) {
  return `${item.title} ${item.summary}`.toLowerCase().includes(needle);
}

function productResult(product: ProductListView): SearchResult {
  return {
    id: product.id,
    title: product.name,
    summary: product.shortDescription,
    href: `/products/${product.slug}`,
    type: "product",
    model: product.model,
    brand: formatBrandName(product.brandDisplayName ?? product.brand),
    category: product.categoryName,
    image: product.image,
  };
}

function editorialResult(item: EditorialItem, type: SearchResult["type"], basePath: string): SearchResult {
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    href: `${basePath}/${item.slug}`,
    type,
    updatedAt: item.publishedAt ?? item.updatedAt,
    image: item.coverImage,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "searchPage" });
  return localizedMetadata(locale, "/search", t("title"), t("description"), true);
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "searchPage" }),
    getTranslations({ locale, namespace: "common" }),
  ]);
  const searchQuery = await searchParams;
  const query = queryValue(searchQuery.q);
  const requestedFilter = filterValue(searchQuery.filter);
  const needle = query.toLowerCase();
  let results: SearchResult[] = [];
  let productTotalCount = 0;

  if (needle) {
    const [productPage, solutions, cases, news] = await Promise.all([
      getProductCatalogPage(locale, { query: needle, page: 1 }),
      getEditorialSummaries(locale, "industries"),
      getEditorialSummaries(locale, "cases"),
      getEditorialSummaries(locale, "news"),
    ]);
    productTotalCount = productPage.totalCount;
    results = [
      ...productPage.products.map(productResult),
      ...solutions.filter((item) => editorialMatches(item, needle)).map((item) => editorialResult(item, "solution", "/solutions")),
      ...cases.filter((item) => editorialMatches(item, needle)).map((item) => editorialResult(item, "case", "/cases")),
      ...news.filter((item) => editorialMatches(item, needle)).map((item) => editorialResult(item, "news", "/news")),
    ];
  }

  const productResults = results.filter((item) => item.type === "product");
  const editorialResultCount = results.length - productResults.length;
  const groups: Array<{ type: SearchResult["type"]; title: string; items: SearchResult[]; count: number }> = [
    { type: "product", title: t("groupProducts"), items: productResults, count: productTotalCount },
    { type: "solution", title: t("groupSolutions"), items: results.filter((item) => item.type === "solution"), count: results.filter((item) => item.type === "solution").length },
    { type: "case", title: t("groupCases"), items: results.filter((item) => item.type === "case"), count: results.filter((item) => item.type === "case").length },
    { type: "news", title: t("groupNews"), items: results.filter((item) => item.type === "news"), count: results.filter((item) => item.type === "news").length },
  ];
  const totalResultCount = productTotalCount + editorialResultCount;
  const activeFilter = requestedFilter;
  const visibleResultCount = activeFilter === "all" ? totalResultCount : groups.find((group) => group.type === activeFilter)?.count ?? 0;
  const visibleGroups = groups.filter((group) => activeFilter === "all" || group.type === activeFilter);
  const filterOptions: Array<{ value: SearchFilter; label: string }> = [
    { value: "all", label: t("filterAll") },
    { value: "product", label: t("groupProducts") },
    { value: "solution", label: t("groupSolutions") },
    { value: "case", label: t("groupCases") },
    { value: "news", label: t("groupNews") },
  ];

  return (
    <main id="main-content" className="search-page">
      <EditorialPageHeader title={t("title")} description={t("description")} />

      <div className="page-shell py-4 md:py-5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink render={<Link locale={locale} href="/" />}>{common("home")}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{t("title")}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <section className="page-shell pb-5 md:pb-7">
        <form action={`/${locale}/search`} method="get" className="flex max-w-4xl gap-2">
          <label htmlFor="site-search" className="sr-only">{t("searchLabel")}</label>
          <Input id="site-search" name="q" type="search" maxLength={120} defaultValue={query} placeholder={t("searchPlaceholder")} className="h-11 bg-background sm:flex-1" />
          <Button type="submit" size="lg" className="px-4 sm:px-6"><SearchIcon data-icon="inline-start" aria-hidden />{t("submit")}</Button>
        </form>
        {needle ? (
          <div className="mt-5 flex flex-col gap-4 sm:mt-6">
            <p className="text-sm text-muted-foreground" role="status">{t("resultCount", { count: visibleResultCount })}</p>
            <nav aria-label={t("filterLabel")} className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {filterOptions.map((option) => {
                const selected = activeFilter === option.value;
                const href = `/search?q=${encodeURIComponent(query)}${option.value === "all" ? "" : `&filter=${option.value}`}`;
                return selected ? (
                  <span key={option.value} aria-current="page" className="border-b-2 border-primary pb-1 text-sm font-semibold text-foreground">{option.label}</span>
                ) : (
                  <Link key={option.value} locale={locale} href={href} prefetch={false} className="pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground">{option.label}</Link>
                );
              })}
            </nav>
          </div>
        ) : null}
      </section>

      <section className="page-shell pb-8 pt-3 md:pb-14 md:pt-5">
        {!needle ? (
          <Empty className="min-h-60 border bg-background">
            <EmptyHeader><SearchIcon className="size-8 text-muted-foreground" aria-hidden /><EmptyTitle>{t("emptyPromptTitle")}</EmptyTitle><EmptyDescription>{t("emptyPromptDescription")}</EmptyDescription></EmptyHeader>
          </Empty>
        ) : visibleResultCount === 0 ? (
          <Empty className="min-h-60 border bg-background">
            <EmptyHeader><EmptyTitle>{t("noResultsTitle")}</EmptyTitle><EmptyDescription>{t("noResultsDescription", { query })}</EmptyDescription></EmptyHeader>
            <EmptyContent><Button variant="outline" nativeButton={false} render={<Link locale={locale} href="/search" />}>{t("clearSearch")}</Button></EmptyContent>
          </Empty>
        ) : (
          <div className="mx-auto max-w-6xl">
            <div className="space-y-8 md:space-y-12">
              {visibleGroups.filter((group) => group.items.length).map((group) => (
                <section key={group.type} aria-labelledby={`search-group-${group.type}`}>
                  <div className="mb-3 flex items-baseline justify-between gap-4 md:mb-4"><h3 id={`search-group-${group.type}`} className="text-lg font-semibold md:text-2xl">{group.title}</h3><span className="text-xs text-muted-foreground md:text-sm">{group.count}</span></div>
                  <div className="divide-y border-y">{group.items.map((item, index) => <ResultCard key={`${item.type}-${item.id}`} item={item} locale={locale} hideOnMobile={group.type === "product" && index >= 6} labels={{ model: t("model"), updated: t("updated"), viewProduct: t("viewProduct"), viewDetails: t("viewDetails") }} />)}</div>
                  {group.type === "product" && group.count > 6 ? <Link locale={locale} href={`/products?q=${encodeURIComponent(query)}`} prefetch={false} className={`mt-4 min-h-11 items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-hover ${group.count > group.items.length ? "inline-flex" : "inline-flex sm:hidden"}`}>{t("viewAllProducts")}<ArrowRightIcon className="size-4" aria-hidden /></Link> : null}
                </section>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function ResultCard({ item, locale, labels, hideOnMobile = false }: { item: SearchResult; locale: Locale; labels: Record<string, string>; hideOnMobile?: boolean }) {
  const isProduct = item.type === "product";
  const date = item.updatedAt ? new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(item.updatedAt)) : undefined;
  return (
    <article className={`group search-result-card ${hideOnMobile ? "hidden sm:block" : ""}`}>
      <Link locale={locale} href={item.href} prefetch={isProduct ? false : undefined} className="grid min-w-0 flex-1 grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 py-4 sm:flex sm:gap-6 sm:py-6">
        {isProduct ? (
          <div className="size-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-muted sm:size-28">{item.image ? <Image src={item.image.src} alt={item.image.alt} width={item.image.width} height={item.image.height} sizes="(max-width: 639px) 72px, 112px" className="size-full object-contain transition-transform duration-400 group-hover:scale-[1.04]" /> : <span className="grid size-full place-items-center text-muted-foreground" role="img" aria-label={item.title}><BoxesIcon className="size-6" aria-hidden /></span>}</div>
        ) : item.image ? (
          <div className="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-muted sm:h-20 sm:w-32"><Image src={item.image.src} alt={item.image.alt} width={item.image.width} height={item.image.height} sizes="(max-width: 639px) 72px, 128px" className="size-full object-cover transition-transform duration-400 group-hover:scale-[1.04]" /></div>
        ) : (
          <div className="grid size-[4.5rem] shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground sm:size-20"><FileTextIcon aria-hidden /></div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-x-2 overflow-hidden whitespace-nowrap text-[11px] font-medium text-muted-foreground sm:gap-x-3 sm:text-xs">{isProduct ? <><span className="shrink-0">{item.brand}</span><span className="truncate">{item.category}</span><span className="hidden sm:inline">{labels.model}: {item.model}</span></> : date ? <time dateTime={item.updatedAt}>{labels.updated}: {date}</time> : null}</div>
          <h4 className="mt-1.5 line-clamp-2 text-base font-semibold leading-snug transition-colors duration-200 group-hover:text-primary sm:mt-2 sm:text-lg md:text-xl">{item.title}</h4>
          <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground sm:mt-2 sm:line-clamp-2 sm:text-sm sm:leading-6">{item.summary}</p>
        </div>
        <span className={`${isProduct ? "hidden sm:inline-flex" : "col-start-2 row-start-2 inline-flex"} min-h-9 items-center justify-self-end gap-2 text-xs font-medium text-foreground transition-colors duration-200 group-hover:text-primary sm:ms-auto sm:min-h-0 sm:self-center sm:text-sm`}>{isProduct ? labels.viewProduct : labels.viewDetails}<ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden /></span>
      </Link>
    </article>
  );
}
