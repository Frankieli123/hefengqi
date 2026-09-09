import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { getProducts } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ ids?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; assertLocale(locale); const t = await getTranslations({ locale, namespace: "products" }); return localizedMetadata(locale, "/products/compare", t("comparison"), t("comparisonHelp"), true); }

export default async function ComparePage({ params, searchParams }: Props) {
  const { locale } = await params; assertLocale(locale); setRequestLocale(locale); const { ids = "" } = await searchParams;
  const [products, t, common] = await Promise.all([getProducts(locale), getTranslations("products"), getTranslations("common")]);
  const requested = ids.split(",").filter(Boolean).slice(0, 3); const candidates = products.filter((product) => requested.includes(product.id)); const category = candidates[0]?.categoryKey; const selected = candidates.filter((product) => product.categoryKey === category).slice(0, 3);
  const keys = Array.from(new Set(selected.flatMap((product) => product.attributes.filter((item) => item.comparable).map((item) => item.key))));
  return <main id="main-content" className="page-shell section-pad"><div className="flex max-w-3xl flex-col gap-5"><span className="eyebrow">Compare</span><h1 className="section-title">{t("comparison")}</h1><p className="text-lg leading-8 text-muted-foreground">{t("comparisonHelp")}</p></div>{selected.length ? <div className="mt-12"><Table><TableHeader><TableRow><TableHead>{t("keySpecs")}</TableHead>{selected.map((product) => <TableHead key={product.id}><div className="flex min-w-52 flex-col items-start gap-2"><span>{product.name}</span><span className="text-xs font-normal text-muted-foreground">{product.model}</span><Button variant="ghost" size="xs" render={<Link href={`/products/compare?ids=${selected.filter((item) => item.id !== product.id).map((item) => item.id).join(",")}`} />}><XIcon data-icon="inline-start" />{t("remove")}</Button></div></TableHead>)}</TableRow></TableHeader><TableBody>{keys.map((key) => <TableRow key={key}><TableCell className="font-medium">{selected.flatMap((product) => product.attributes).find((attribute) => attribute.key === key)?.label ?? key}</TableCell>{selected.map((product) => { const value = product.attributes.find((attribute) => attribute.key === key); return <TableCell key={product.id}>{value ? `${value.value}${value.unit ? ` ${value.unit}` : ""}` : "—"}</TableCell>; })}</TableRow>)}</TableBody></Table><div className="mt-8 flex gap-3"><Button render={<Link href={`/contact?productId=${selected[0]?.id ?? ""}`} />}>{common("inquiry")}</Button><Button variant="outline" render={<Link href="/products" />}>{common("products")}</Button></div></div> : <Empty className="mt-12 border"><EmptyHeader><EmptyTitle>{t("comparison")}</EmptyTitle><EmptyDescription>{t("comparisonHelp")}</EmptyDescription></EmptyHeader><EmptyContent><Button render={<Link href="/products" />}>{common("products")}</Button></EmptyContent></Empty>}</main>;
}
