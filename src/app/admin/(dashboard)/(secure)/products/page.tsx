import { BotIcon, CodeIcon, PlusIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductListTable, type AdminProductItem } from "@/components/admin/product-list-table";
import { db } from "@/lib/db";
import { getAiApiKeyStatus } from "@/lib/api-auth";

export const metadata = { title: "产品管理", robots: { index: false, follow: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; saved?: string }>;
}) {
  const [query, rawProducts, apiKeyStatus] = await Promise.all([
    searchParams,
    db.product.findMany({
      include: {
        brand: true,
        category: {
          include: {
            translations: { where: { locale: "zh" } },
            parent: {
              include: {
                translations: { where: { locale: "zh" } },
                parent: {
                  include: {
                    translations: { where: { locale: "zh" } },
                  },
                },
              },
            },
          },
        },
        translations: { where: { locale: "zh" } },
        media: {
          include: { asset: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      // Stable order: do NOT use updatedAt, so updating primaryImageId or edits does not cause the row to jump
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    getAiApiKeyStatus(),
  ]);

  const products: AdminProductItem[] = rawProducts.map((p) => {
    const c = p.category;
    const leafZh = c.translations[0]?.name ?? c.key;
    const parentZh = c.parent?.translations[0]?.name ?? c.parent?.key;
    const rootZh =
      c.parent?.parent?.translations[0]?.name ??
      (c.level === 2 ? c.parent?.translations[0]?.name : null);

    // If level 3 (brand leaf) or leaf name equals brand name or parent exists with parent
    const isBrandLeaf =
      c.level === 3 ||
      Boolean(
        c.parent &&
          (leafZh.toLowerCase() === p.brand.name.toLowerCase() ||
            ["维谛", "华为", "中兴", "台达", "ELTEK", "动力源", "科士达", "伊顿"].some(
              (b) => leafZh.includes(b),
            )),
      );

    const actualName = isBrandLeaf && parentZh ? parentZh : leafZh;
    const rootName = isBrandLeaf
      ? (rootZh ?? c.parent?.parent?.key ?? null)
      : (c.parent?.translations[0]?.name ?? null);

    return {
      id: p.id,
      model: p.model,
      sku: p.sku,
      origin: p.origin,
      status: p.status as AdminProductItem["status"],
      viewCount: p.viewCount,
      updatedAt: p.updatedAt.toISOString(),
      primaryImageId: p.primaryImageId,
      brand: {
        id: p.brand.id,
        name: p.brand.name,
      },
      category: {
        id: c.id,
        key: c.key,
        name: leafZh,
        actualName,
        rootName,
      },
      translations: p.translations.map((t) => ({
        locale: t.locale,
        name: t.name,
        slug: t.slug,
      })),
      media: p.media.map((m) => ({
        asset: {
          id: m.asset.id,
          originalName: m.asset.originalName,
          storageKey: m.asset.storageKey,
          kind: m.asset.kind,
        },
      })),
    };
  });

  return (
    <main className="flex min-w-0 max-w-full flex-col gap-6 p-4 md:p-6 lg:p-8 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">产品管理与发布</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            快速检索商品、一键切换主图、编辑实时自动上架与边缘缓存刷新。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<a href="/api/admin/products/schema" target="_blank" />}>
            <CodeIcon data-icon="inline-start" />查看 AI 接口结构
          </Button>
          <Button render={<a href="/admin/products/new" />}>
            <PlusIcon data-icon="inline-start" />新建产品
          </Button>
        </div>
      </div>

      {query.error ? (
        <Alert variant="destructive">
          <AlertTitle>操作失败</AlertTitle>
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}
      {query.success || query.saved ? (
        <Alert>
          <AlertTitle>操作成功</AlertTitle>
          <AlertDescription>
            {query.saved === "media" || query.success === "media-updated"
              ? "产品主图已成功更新，前台卡片与详情页已同步刷新。"
              : query.saved === "published"
              ? "产品已保存并直接上架发布，前台页面与 CDN 缓存已同步刷新。"
              : "产品状态已更新，相关页面与 CDN 缓存已刷新。"}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BotIcon className="size-5 text-primary" />
            <CardTitle className="text-base">AI 自动化上传产品与说明 API</CardTitle>
          </div>
          <CardDescription>
            支持外部大模型或自动化工作流通过 REST API 直接上传产品型号、七语说明（是什么/解决问题/优势亮点/应用领域/FAQ）、规格参数及说明文档。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
            <span className="font-semibold text-foreground">API 接入端点:</span>
            <code className="rounded bg-muted px-2 py-1 font-mono">POST /api/admin/products</code>
          </div>
          <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
            <span className="font-semibold text-foreground">鉴权请求头:</span>
            <code className="rounded bg-muted px-2 py-1 font-mono">
              Authorization: Bearer {apiKeyStatus.configured ? "<已配置，密钥不会回显>" : "<需在设置中配置>"}
            </code>
          </div>
          <p className="pt-1 text-muted-foreground">
            若需查看完整字段定义与可填写的分类参数字典，可访问{" "}
            <a href="/api/admin/products/schema" target="_blank" className="font-medium text-primary underline">
              /api/admin/products/schema
            </a>
            ；若需修改密钥，请前往{" "}
            <a href="/admin/settings" className="font-medium text-primary underline">
              站点设置
            </a>
            。
          </p>
        </CardContent>
      </Card>

      <ProductListTable products={products} />
    </main>
  );
}
