import { PlusIcon } from "lucide-react";
import { changeCategoryStatus } from "@/app/admin/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSecureAdmin } from "@/lib/admin-session";
import { categoryPath, sortCategoryTree } from "@/lib/category-tree";
import { db } from "@/lib/db";

export const metadata = { title: "产品分类", robots: { index: false, follow: false } };
const statuses: Record<string, string> = { DRAFT: "草稿", PUBLISHED: "已发布", ARCHIVED: "已归档", NEEDS_REVIEW: "待复核", READY: "待发布" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; updated?: string }> }) {
  await requireSecureAdmin("ADMIN");
  const [query, categories] = await Promise.all([
    searchParams,
    db.category.findMany({ include: { translations: true, _count: { select: { products: true, children: true } } } }),
  ]);
  const search = (query.q ?? "").trim().toLowerCase();
  const rows = sortCategoryTree(categories).filter((category) => !search || category.key.includes(search) || category.translations.some((item) => item.name.toLowerCase().includes(search)));
  return <div className="flex flex-col gap-6 p-5 md:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">产品分类</h1><p className="mt-2 text-sm text-muted-foreground">管理三级目录、三语名称、展示顺序与发布状态。已发布分类的修改会同步到官网。</p></div><Button nativeButton={false} render={<a href="/admin/categories/new" />}><PlusIcon data-icon="inline-start" />新建分类</Button></div>
    {query.error ? <Alert variant="destructive"><AlertTitle>操作未完成</AlertTitle><AlertDescription>{query.error}</AlertDescription></Alert> : null}
    {query.updated ? <Alert><AlertTitle>状态已更新</AlertTitle><AlertDescription>官网分类目录已同步更新。</AlertDescription></Alert> : null}
    <form method="get"><FieldGroup className="flex-row items-end"><Field className="max-w-sm"><FieldLabel htmlFor="category-search">搜索分类</FieldLabel><Input id="category-search" name="q" defaultValue={query.q} placeholder="输入分类名称或内部标识" /></Field><Button type="submit" variant="outline">搜索</Button>{search ? <Button variant="ghost" nativeButton={false} render={<a href="/admin/categories" />}>清除</Button> : null}</FieldGroup></form>
    <p className="text-sm text-muted-foreground">共 {categories.length} 个分类，{categories.filter((item) => item.status === "PUBLISHED").length} 个已发布。按层级和同级排序显示。</p>
    <Table><TableHeader><TableRow><TableHead>分类名称 / 层级</TableHead><TableHead>排序</TableHead><TableHead>产品 / 子分类</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader><TableBody>
      {rows.map((category) => {
        const name = category.translations.find((item) => item.locale === "zh")?.name ?? category.key;
        const path = categoryPath(categories, category.id, "zh");
        return <TableRow key={category.id}>
          <TableCell><div style={{ paddingInlineStart: `${(category.level - 1) * 20}px` }}><a href={`/admin/categories/${category.id}`} className="font-medium hover:underline">{name}</a><p className="mt-1 text-xs text-muted-foreground">{category.level} 级 · {category.key}</p></div></TableCell>
          <TableCell>{category.sortOrder}</TableCell><TableCell>{category._count.products} / {category._count.children}</TableCell><TableCell><Badge variant={category.status === "PUBLISHED" ? "default" : "secondary"}>{statuses[category.status]}</Badge></TableCell>
          <TableCell><div className="flex flex-wrap items-center gap-1">
            <Button size="sm" variant="outline" nativeButton={false} render={<a href={`/admin/categories/${category.id}`} />}>编辑</Button>
            {category.level < 3 && category.status !== "ARCHIVED" ? <Button size="sm" variant="ghost" nativeButton={false} render={<a href={`/admin/categories/new?parentId=${category.id}`} />}>添加子分类</Button> : null}
            <form action={changeCategoryStatus} className="flex gap-1"><input type="hidden" name="categoryId" value={category.id} />
              {category.status === "PUBLISHED" ? <Button type="submit" name="status" value="DRAFT" size="sm" variant="ghost">停用</Button> : <Button type="submit" name="status" value="PUBLISHED" size="sm" variant="ghost">发布</Button>}
              {category.status === "ARCHIVED" ? <Button type="submit" name="status" value="DRAFT" size="sm" variant="ghost">恢复草稿</Button> : <Button type="submit" name="status" value="ARCHIVED" size="sm" variant="ghost">归档</Button>}
            </form>
            {category.status === "PUBLISHED" && path ? <Button size="sm" variant="ghost" nativeButton={false} render={<a href={`/zh/products/category/${path}`} target="_blank" rel="noreferrer" />}>查看官网</Button> : null}
          </div></TableCell>
        </TableRow>;
      })}
      {!rows.length ? <TableRow><TableCell colSpan={5}>暂无匹配分类。可以调整搜索条件或新建分类。</TableCell></TableRow> : null}
    </TableBody></Table>
  </div>;
}
