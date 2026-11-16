import { CategoryForm } from "@/components/admin/category-form";
import { requireSecureAdmin } from "@/lib/admin-session";
import { sortCategoryTree } from "@/lib/category-tree";
import { db } from "@/lib/db";

export const metadata = { title: "新建产品分类", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ parentId?: string }> }) {
  await requireSecureAdmin("ADMIN");
  const [query, categories] = await Promise.all([searchParams, db.category.findMany({ include: { translations: { where: { locale: "zh" } } } })]);
  const parents = sortCategoryTree(categories).filter((item) => item.status !== "ARCHIVED" && item.level < 3).map((item) => ({ value: item.id, label: `${item.translations[0]?.name ?? item.key}（${item.level}级）` }));
  return <div className="flex flex-col gap-6 p-5 md:p-8"><div><h1 className="text-2xl font-semibold">新建产品分类</h1><p className="mt-2 text-sm text-muted-foreground">保存为草稿后，确认资料并发布即可显示在官网。</p></div><CategoryForm parents={parents} defaultParentId={parents.some((item) => item.value === query.parentId) ? query.parentId : "none"} /></div>;
}
