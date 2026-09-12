import { reviewMediaAsset } from "@/app/admin/actions";
import Image from "next/image";
import { MediaLibraryUpload } from "@/components/admin/product-media-upload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requireSecureAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";

export const metadata = { title: "媒体库", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ q?: string; page?: string; saved?: string; error?: string }> };

function pageHref(page: number, q: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  return `/admin/media?${params}`;
}

export default async function MediaPage({ searchParams }: Props) {
  await requireSecureAdmin("ADMIN");
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 120) ?? "";
  const requestedPage = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const pageSize = 12;
  const where = { kind: "IMAGE" as const, ...(q ? { originalName: { contains: q, mode: "insensitive" as const } } : {}) };
  const total = await db.mediaAsset.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const assets = await db.mediaAsset.findMany({
    where,
    include: { _count: { select: { productLinks: true, heroDesktopUses: true, heroMobileUses: true, newsCoverUses: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return <main className="flex flex-col gap-8 p-5 md:p-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold">媒体库</h1><p className="mt-2 text-sm text-muted-foreground">统一管理产品与首页使用的图片。只有已通过扫描并确认授权的素材可以公开显示。</p></div><Button variant="outline" render={<a href="/admin/settings#home-hero" />}>编辑首页 Hero</Button></div>
    {query.saved ? <Alert><AlertTitle>素材状态已保存</AlertTitle><AlertDescription>公开页面会自动重新校验该素材的扫描与授权状态。</AlertDescription></Alert> : null}
    {query.error ? <Alert variant="destructive"><AlertTitle>无法保存</AlertTitle><AlertDescription>{query.error === "rights-note-required" ? "确认授权时必须填写来源或授权说明。" : query.error === "source-url-invalid" ? "来源链接必须是有效的 HTTPS 地址。" : "请确认素材已通过安全扫描后重试。"}</AlertDescription></Alert> : null}
    <Card className="max-w-3xl"><CardHeader><CardTitle>上传图片</CardTitle><CardDescription>上传完成后仍需管理员核实素材来源和使用权。</CardDescription></CardHeader><CardContent><MediaLibraryUpload /></CardContent></Card>
    <form className="flex max-w-xl gap-2" action="/admin/media" method="get"><Field className="flex-1"><FieldLabel htmlFor="media-search" className="sr-only">搜索文件名</FieldLabel><Input id="media-search" name="q" defaultValue={q} placeholder="搜索文件名…" autoComplete="off" /></Field><Button type="submit" variant="outline">搜索</Button></form>
    {assets.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{assets.map((asset) => {
      const usageCount = asset._count.productLinks + asset._count.heroDesktopUses + asset._count.heroMobileUses + asset._count.newsCoverUses;
      return <Card key={asset.id} className="min-w-0 bg-background">
        {asset.width && asset.height ? <div className="aspect-16/9 overflow-hidden bg-muted"><Image src={`/media/${asset.storageKey}`} alt="" width={asset.width} height={asset.height} sizes="(max-width: 768px) 100vw, 33vw" className="size-full object-cover" /></div> : null}
        <CardHeader><CardTitle className="truncate" title={asset.originalName}>{asset.originalName}</CardTitle><CardDescription>{asset.width ?? "—"} × {asset.height ?? "—"} · {asset.scanStatus} · 使用 {usageCount} 处</CardDescription></CardHeader>
        <CardContent><form action={reviewMediaAsset}><input type="hidden" name="assetId" value={asset.id} /><FieldGroup><Field orientation="horizontal"><Checkbox id={`approved-${asset.id}`} name="rightsApproved" defaultChecked={asset.rightsApproved} disabled={asset.scanStatus !== "CLEAN"} /><FieldLabel htmlFor={`approved-${asset.id}`}>授权已核实</FieldLabel></Field><Field><FieldLabel htmlFor={`note-${asset.id}`}>来源或授权说明</FieldLabel><Input id={`note-${asset.id}`} name="rightsNote" defaultValue={asset.rightsNote ?? ""} placeholder="例如：AI 生成临时素材…" maxLength={500} /><FieldDescription>确认授权时必填，并说明可公开使用的依据。</FieldDescription></Field><Field><FieldLabel htmlFor={`source-${asset.id}`}>来源链接（选填）</FieldLabel><Input id={`source-${asset.id}`} name="sourceUrl" type="url" inputMode="url" defaultValue={asset.sourceUrl ?? ""} placeholder="https://…" autoComplete="off" /></Field><Button type="submit" size="sm" variant="outline" className="self-start" disabled={asset.scanStatus !== "CLEAN"}>保存素材复核</Button></FieldGroup></form></CardContent>
      </Card>;
    })}</div> : <Alert><AlertTitle>媒体库中还没有图片</AlertTitle><AlertDescription>先上传图片并完成扫描与授权复核，之后即可在首页 Hero 中选择。</AlertDescription></Alert>}
    {pageCount > 1 ? <nav aria-label="媒体库分页" className="flex items-center justify-center gap-3"><Button variant="outline" disabled={page <= 1} render={page > 1 ? <a href={pageHref(page - 1, q)} /> : undefined}>上一页</Button><span className="text-sm text-muted-foreground">第 {page} / {pageCount} 页</span><Button variant="outline" disabled={page >= pageCount} render={page < pageCount ? <a href={pageHref(page + 1, q)} /> : undefined}>下一页</Button></nav> : null}
  </main>;
}
