import { notFound } from "next/navigation";
import { changeCategoryStatus } from "@/app/admin/actions";
import { CategoryForm } from "@/components/admin/category-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireSecureAdmin } from "@/lib/admin-session";
import { categoryDescendantIds, sortCategoryTree } from "@/lib/category-tree";
import { db } from "@/lib/db";
import { homeProductSeries } from "@/lib/home-product-series";

export const metadata = { title: "编辑产品分类", robots: { index: false, follow: false } };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireSecureAdmin("ADMIN");
  const [{ id }, query, categories] = await Promise.all([params, searchParams, db.category.findMany({ include: { translations: true } })]);
  const category = categories.find((item) => item.id === id);
  if (!category) notFound();
  const descendants = categoryDescendantIds(categories, id);
  const featuredProducts = await db.product.findMany({
    where: {
      categoryId: { in: [...descendants] },
      status: "PUBLISHED",
      brand: { archivedAt: null, rightsConfirmed: true },
      translations: { some: { locale: "zh", published: true } },
      media: { some: { asset: { kind: "IMAGE", scanStatus: "CLEAN", rightsApproved: true } } },
    },
    select: {
      id: true,
      model: true,
      primaryImageId: true,
      brand: { select: { name: true } },
      translations: { where: { locale: "zh", published: true }, select: { name: true } },
      media: {
        where: { asset: { kind: "IMAGE", scanStatus: "CLEAN", rightsApproved: true } },
        select: { assetId: true, asset: { select: { storageKey: true, width: true, height: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ publishedAt: "desc" }, { model: "asc" }, { id: "asc" }],
  });
  const parents = sortCategoryTree(categories).filter((item) => !descendants.has(item.id) && item.status !== "ARCHIVED" && item.level < 3).map((item) => ({ value: item.id, label: `${item.translations.find((translation) => translation.locale === "zh")?.name ?? item.key}（${item.level}级）` }));
  // Keep an archived current parent visible until the administrator chooses a new one.
  const parent = categories.find((item) => item.id === category.parentId);
  if (parent && !parents.some((item) => item.value === parent.id)) parents.push({ value: parent.id, label: `${parent.translations.find((item) => item.locale === "zh")?.name ?? parent.key}（已归档，请调整）` });
  const input = { id, key: category.key, parentId: category.parentId, sortOrder: category.sortOrder, homeFeaturedProductId: category.homeFeaturedProductId, translations: category.translations.map((item) => ({ locale: item.locale, slug: item.slug, name: item.name, description: item.description, seoTitle: item.seoTitle ?? "", seoDescription: item.seoDescription ?? "" })) };
  const featuredProductOptions = featuredProducts.flatMap((product) => {
    const primary = product.media.find((item) => item.assetId === product.primaryImageId);
    if (!primary?.asset.width || !primary.asset.height) return [];
    return [{
      id: product.id,
      model: product.model,
      brand: product.brand.name,
      name: product.translations[0]?.name ?? product.model,
      image: { src: `/media/${primary.asset.storageKey}`, width: primary.asset.width, height: primary.asset.height },
    }];
  });
  return <div className="flex flex-col gap-6 p-5 md:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">编辑分类 · {category.translations.find((item) => item.locale === "zh")?.name ?? category.key}</h1><p className="mt-2 text-sm text-muted-foreground">{category.status === "PUBLISHED" ? "当前已发布，保存后会同步更新官网。" : "当前未发布，保存后可发布到官网。"}</p></div><Button variant="outline" nativeButton={false} render={<a href="/admin/settings#home-product-series" />}>首页产品系列设置</Button></div>
    {query.saved ? <Alert><AlertTitle>分类已保存</AlertTitle><AlertDescription>{category.status === "PUBLISHED" ? "分类资料与官网目录已更新。" : "草稿已保存，点击发布分类后显示在官网。"}</AlertDescription></Alert> : null}
    {category.status !== "PUBLISHED" ? <form action={changeCategoryStatus}><input type="hidden" name="categoryId" value={id} /><Button type="submit" name="status" value="PUBLISHED">发布分类</Button></form> : null}
    <CategoryForm key={category.updatedAt.toISOString()} category={input} parents={parents} featuredProducts={featuredProductOptions} homeSeriesEnabled={homeProductSeries.some((item) => item.categoryKey === category.key)} />
  </div>;
}
