import { notFound, redirect } from "next/navigation";
import { changeAttributeArchiveState, changeBrandArchiveState, updateAttributeDefinition, updateBrand } from "@/app/admin/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireSecureAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";

export const metadata = { title: "编辑目录项", robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

function Feedback({ saved, error }: { saved?: string; error?: string }) {
  if (saved) return <Alert><AlertTitle>已保存</AlertTitle><AlertDescription>目录项已更新并写入审计记录。</AlertDescription></Alert>;
  if (error) return <Alert variant="destructive"><AlertTitle>无法保存</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  return null;
}

function Header({ title, status }: { title: string; status?: string }) {
  return <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><h1 className="text-2xl font-semibold">{title}</h1>{status ? <Badge variant="secondary">{status}</Badge> : null}</div><Button variant="outline" render={<a href="/admin/taxonomy" />}>返回目录</Button></div>;
}

export default async function Page({ params, searchParams }: Props) {
  const [{ kind, id }, query] = await Promise.all([params, searchParams, requireSecureAdmin("ADMIN")]);

  if (kind === "brand") {
    const brand = await db.brand.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!brand) notFound();
    return <main className="flex flex-col gap-6 p-5 md:p-8"><Header title={`编辑品牌 · ${brand.name}`} status={brand.archivedAt ? "ARCHIVED" : "ACTIVE"} /><Feedback {...query} /><Card className="max-w-3xl"><CardHeader><CardTitle>品牌资料</CardTitle><CardDescription>归档品牌不会出现在新建产品选项中；存在已发布产品时不能归档。</CardDescription></CardHeader><CardContent><form action={updateBrand}><input type="hidden" name="brandId" value={brand.id} /><FieldGroup><Field><FieldLabel htmlFor="name">名称</FieldLabel><Input id="name" name="name" defaultValue={brand.name} required /></Field><Field><FieldLabel htmlFor="slug">Slug</FieldLabel><Input id="slug" name="slug" defaultValue={brand.slug} pattern="[a-z0-9][a-z0-9-]*" required /></Field><Field><FieldLabel htmlFor="website">官方网站</FieldLabel><Input id="website" name="website" type="url" defaultValue={brand.website ?? ""} /></Field><Field orientation="horizontal"><Checkbox id="rightsConfirmed" name="rightsConfirmed" defaultChecked={brand.rightsConfirmed} /><div><FieldLabel htmlFor="rightsConfirmed">已确认经销或展示权</FieldLabel><FieldDescription>发布产品前必须确认；单张图片仍需独立审核。</FieldDescription></div></Field><p className="text-sm text-muted-foreground">关联产品：{brand._count.products} 个</p><Button type="submit" className="self-start">保存品牌</Button></FieldGroup></form></CardContent></Card><form action={changeBrandArchiveState}><input type="hidden" name="brandId" value={brand.id} /><Button type="submit" name="action" value={brand.archivedAt ? "restore" : "archive"} variant="outline">{brand.archivedAt ? "恢复品牌" : "归档品牌"}</Button></form></main>;
  }

  if (kind === "category") redirect(`/admin/categories/${id}`);

  if (kind === "attribute") {
    const definition = await db.attributeDefinition.findUnique({ where: { id }, include: { category: { include: { translations: { where: { locale: "zh" } } } }, _count: { select: { values: true } } } });
    if (!definition) notFound();
    const labels = definition.labels as Record<string, string>;
    const options = Array.isArray(definition.options) ? definition.options.filter((item): item is string => typeof item === "string").join("\n") : "";
    return <main className="flex flex-col gap-6 p-5 md:p-8"><Header title={`编辑参数 · ${labels.zh ?? definition.key}`} status={definition.archivedAt ? "ARCHIVED" : definition.type} /><Feedback {...query} /><Card className="max-w-3xl"><CardHeader><CardTitle>参数定义</CardTitle><CardDescription>为保护已有数据，字段类型和所属分类创建后不可更改；存在已发布产品值时不能归档。</CardDescription></CardHeader><CardContent><form action={updateAttributeDefinition}><input type="hidden" name="definitionId" value={definition.id} /><FieldGroup><p className="text-sm text-muted-foreground">分类：{definition.category.translations[0]?.name ?? definition.category.key} · 类型：{definition.type} · 已填写：{definition._count.values}</p><div className="grid gap-5 sm:grid-cols-2"><Field><FieldLabel htmlFor="key">参数键</FieldLabel><Input id="key" name="key" defaultValue={definition.key} pattern="[a-z0-9][a-z0-9_.-]*" required /></Field><Field><FieldLabel htmlFor="sortOrder">排序</FieldLabel><Input id="sortOrder" name="sortOrder" type="number" min="0" max="10000" defaultValue={definition.sortOrder} required /></Field><Field><FieldLabel htmlFor="standardUnit">标准单位</FieldLabel><Input id="standardUnit" name="standardUnit" defaultValue={definition.standardUnit ?? ""} /></Field></div><div className="grid gap-5 sm:grid-cols-3">{(["zh", "en", "ru"] as const).map((locale) => <Field key={locale}><FieldLabel htmlFor={`${locale}Label`}>{locale.toUpperCase()} 标签</FieldLabel><Input id={`${locale}Label`} name={`${locale}Label`} defaultValue={labels[locale]} required /></Field>)}</div>{definition.type === "SELECT" ? <Field><FieldLabel htmlFor="options">枚举选项</FieldLabel><Textarea id="options" name="options" defaultValue={options} required /></Field> : null}<FieldSet><FieldLegend>用途</FieldLegend><FieldGroup><Field orientation="horizontal"><Checkbox id="required" name="required" defaultChecked={definition.required} /><FieldLabel htmlFor="required">发布必填</FieldLabel></Field><Field orientation="horizontal"><Checkbox id="filterable" name="filterable" defaultChecked={definition.filterable} /><FieldLabel htmlFor="filterable">用于筛选</FieldLabel></Field><Field orientation="horizontal"><Checkbox id="comparable" name="comparable" defaultChecked={definition.comparable} /><FieldLabel htmlFor="comparable">用于对比</FieldLabel></Field></FieldGroup></FieldSet><Button type="submit" className="self-start">保存参数定义</Button></FieldGroup></form></CardContent></Card><form action={changeAttributeArchiveState}><input type="hidden" name="definitionId" value={definition.id} /><Button type="submit" name="action" value={definition.archivedAt ? "restore" : "archive"} variant="outline">{definition.archivedAt ? "恢复参数" : "归档参数"}</Button></form></main>;
  }

  notFound();
}
