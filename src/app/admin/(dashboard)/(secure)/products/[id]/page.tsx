import { notFound } from "next/navigation";
import Image from "next/image";
import { ExternalLinkIcon } from "lucide-react";
import {
  changeProductStatus,
  reviewProductMedia,
  saveProductAttribute,
  updateProductContent,
} from "@/app/admin/actions";
import { ProductFeaturedAttributesForm } from "@/components/admin/product-featured-attributes-form";
import { ProductMediaUpload } from "@/components/admin/product-media-upload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/db";
import { requireSecureAdmin } from "@/lib/admin-session";
import { validateProductForPublication } from "@/lib/publication";
import { cn } from "@/lib/utils";
import { managedLocaleMeta, managedLocales } from "@/lib/admin-locales";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string; saved?: string; error?: string }>;
};

function lines(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .join("\n")
    : "";
}

function options(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export const metadata = {
  title: "编辑产品",
  robots: { index: false, follow: false },
};

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, query, session] = await Promise.all([
    params,
    searchParams,
    requireSecureAdmin(),
  ]);
  const locale = managedLocales.includes(query.locale as typeof managedLocales[number]) ? query.locale as typeof managedLocales[number] : "zh";
  const product = await db.product.findUnique({
    where: { id },
    include: {
      brand: true,
      category: {
        include: {
          translations: { where: { locale: "zh" } },
          attributes: {
            where: { archivedAt: null },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      translations: true,
      attributes: {
        include: { definition: true },
        orderBy: { definition: { sortOrder: "asc" } },
      },
      media: { include: { asset: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!product) notFound();
  const translation = product.translations.find((item) => item.locale === locale) ?? {
    name: "", slug: `${product.model}-${locale}`.toLowerCase().replaceAll(/[^a-z0-9-]/g, "-"), directDefinition: "", shortDescription: "", whatItIs: "", problemSolved: "", suitableFor: "", advantages: [], applications: [], seoTitle: "", seoDescription: "", sourceNote: null,
  };
  const gateErrors = await validateProductForPublication(product.id);

  return (
    <main className="flex flex-col gap-6 p-5 md:p-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold">{product.model}</h1>
            <Badge
              variant={
                product.status === "PUBLISHED"
                  ? "default"
                  : product.status === "NEEDS_REVIEW"
                  ? "destructive"
                  : "secondary"
              }
            >
              {product.status === "PUBLISHED"
                ? "已上架"
                : product.status === "DRAFT"
                ? "草稿"
                : product.status === "NEEDS_REVIEW"
                ? "待审核"
                : "已归档"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {product.brand.name} ·{" "}
            {product.category.translations[0]?.name ?? product.category.key} ·{" "}
            累计浏览 <span className="font-mono font-medium text-foreground">{product.viewCount}</span> 次
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {product.status === "PUBLISHED" && translation.slug ? (
            <Button
              variant="outline"
              render={
                <a
                  href={`/${locale}/products/${translation.slug}`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <ExternalLinkIcon data-icon="inline-start" />在前台预览产品
            </Button>
          ) : null}

          {product.status !== "PUBLISHED" ? (
            <form action={changeProductStatus}>
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="status" value="PUBLISHED" />
              <Button type="submit">立即发布上架</Button>
            </form>
          ) : null}

          <Button variant="outline" render={<a href="/admin/products" />}>
            返回产品列表
          </Button>
        </div>
      </div>

      {/* Status Alerts */}
      {query.saved === "published" ? (
        <Alert>
          <AlertTitle>已保存并直接上架</AlertTitle>
          <AlertDescription>
            产品七语内容与最新修改已生效并同步发布到前台，CDN 边缘缓存已自动刷新。
          </AlertDescription>
        </Alert>
      ) : query.saved === "draft" ? (
        <Alert>
          <AlertTitle>已保存为草稿</AlertTitle>
          <AlertDescription>
            因部分必填项未满足门禁，已保存为草稿。完善后即可一键发布上架。
          </AlertDescription>
        </Alert>
      ) : query.saved === "media" ? (
        <Alert>
          <AlertTitle>主图已更新</AlertTitle>
          <AlertDescription>
            产品主图已成功设置并同步前台页面与卡片。
          </AlertDescription>
        </Alert>
      ) : query.saved === "attribute" ? (
        <Alert>
          <AlertTitle>规格参数已保存</AlertTitle>
          <AlertDescription>
            规格参数已保存并锁定，前台页面已同步刷新。
          </AlertDescription>
        </Alert>
      ) : query.saved === "featured-attributes" ? (
        <Alert>
          <AlertTitle>亮点参数已保存</AlertTitle>
          <AlertDescription>
            前台卡片展示的亮点参数已更新。
          </AlertDescription>
        </Alert>
      ) : query.saved ? (
        <Alert>
          <AlertTitle>保存成功</AlertTitle>
          <AlertDescription>内容与设置已更新。</AlertDescription>
        </Alert>
      ) : null}

      {query.error ? (
        <Alert variant="destructive">
          <AlertTitle>无法保存</AlertTitle>
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}

      {gateErrors.length ? (
        <Alert variant="destructive">
          <AlertTitle>尚未满足发布门禁</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {gateErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTitle>可发布</AlertTitle>
          <AlertDescription>
            七语内容、必填参数和产品主图均已通过校验。
          </AlertDescription>
        </Alert>
      )}

      {/* Language Switcher */}
      <div className="flex flex-wrap gap-2" aria-label="产品内容语言">
        {managedLocales.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={item === locale ? "default" : "outline"}
            render={<a href={`/admin/products/${id}?locale=${item}`} />}
          >
            {item.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Quick Primary Image Switcher on Detail Page */}
      {product.media.length > 0 ? (
        <Card className="max-w-5xl">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">主图设置（点击任意一张即可切换主图）</CardTitle>
                <CardDescription>
                  主图将作为前台商品卡片、搜索结果与详情页首图展示。
                </CardDescription>
              </div>
              <span className="text-xs text-muted-foreground">共 {product.media.length} 张素材</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center gap-3">
              {product.media.map(({ asset }) => {
                const isPrimary = product.primaryImageId === asset.id;
                return (
                  <form key={asset.id} action={reviewProductMedia}>
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="assetId" value={asset.id} />
                    <input type="hidden" name="setPrimary" value="on" />
                    <button
                      type="submit"
                      disabled={isPrimary}
                      title={isPrimary ? "当前主图" : `点击设为主图: ${asset.originalName}`}
                      className={cn(
                        "group relative flex flex-col items-center rounded-lg border p-1.5 transition-all text-left",
                        isPrimary
                          ? "border-primary bg-primary/10 ring-2 ring-primary cursor-default"
                          : "border-border hover:border-primary hover:bg-muted cursor-pointer"
                      )}
                    >
                      <div className="relative size-20 overflow-hidden rounded bg-muted/50">
                        <Image
                          src={`/media/${asset.storageKey}`}
                          alt={asset.originalName}
                          width={80}
                          height={80}
                          className="size-full object-contain p-1"
                        />
                        {isPrimary ? (
                          <span className="absolute bottom-0 inset-x-0 bg-primary py-0.5 text-center text-[10px] font-bold text-white">
                            当前主图
                          </span>
                        ) : (
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-center text-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            设为主图
                          </span>
                        )}
                      </div>
                      <span className="mt-1 max-w-[80px] truncate text-[10px] text-muted-foreground group-hover:text-foreground">
                        {asset.originalName}
                      </span>
                    </button>
                  </form>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Main Content Form */}
      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle>七语产品内容 · {locale.toUpperCase()}</CardTitle>
          <CardDescription>
            保存人工修订后将直接上架发布并同步前台页面，同时建立修订快照。
          </CardDescription>
        </CardHeader>
        <CardContent dir={managedLocaleMeta[locale].direction}>
          <form action={updateProductContent}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="locale" value={locale} />
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="name">产品名称</FieldLabel>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={translation.name}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="slug">Slug</FieldLabel>
                  <Input
                    id="slug"
                    name="slug"
                    defaultValue={translation.slug}
                    pattern="[a-z0-9][a-z0-9-]*"
                    required
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="directDefinition">
                  40–60 字直接定义
                </FieldLabel>
                <Textarea
                  id="directDefinition"
                  name="directDefinition"
                  defaultValue={translation.directDefinition}
                  required
                  minLength={40}
                />
                <FieldDescription>
                  直接回答“这是什么”，不得补写未知型号、认证、库存或价格。
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="shortDescription">列表摘要</FieldLabel>
                <Textarea
                  id="shortDescription"
                  name="shortDescription"
                  defaultValue={translation.shortDescription}
                  required
                />
              </Field>
              <div className="grid gap-5 lg:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="whatItIs">产品是什么</FieldLabel>
                  <Textarea
                    id="whatItIs"
                    name="whatItIs"
                    defaultValue={translation.whatItIs}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="problemSolved">解决什么问题</FieldLabel>
                  <Textarea
                    id="problemSolved"
                    name="problemSolved"
                    defaultValue={translation.problemSolved}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="suitableFor">
                    适合谁与哪些场景
                  </FieldLabel>
                  <Textarea
                    id="suitableFor"
                    name="suitableFor"
                    defaultValue={translation.suitableFor}
                    required
                  />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="advantages">
                    核心优势（每行一项）
                  </FieldLabel>
                  <Textarea
                    id="advantages"
                    name="advantages"
                    defaultValue={lines(translation.advantages)}
                    rows={5}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="applications">
                    应用场景（每行一项）
                  </FieldLabel>
                  <Textarea
                    id="applications"
                    name="applications"
                    defaultValue={lines(translation.applications)}
                    rows={5}
                  />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="seoTitle">SEO 标题</FieldLabel>
                  <Input
                    id="seoTitle"
                    name="seoTitle"
                    defaultValue={translation.seoTitle}
                    required
                    maxLength={120}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="seoDescription">
                    Meta Description
                  </FieldLabel>
                  <Textarea
                    id="seoDescription"
                    name="seoDescription"
                    defaultValue={translation.seoDescription}
                    required
                    maxLength={180}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="sourceNote">资料来源说明</FieldLabel>
                <Textarea
                  id="sourceNote"
                  name="sourceNote"
                  defaultValue={translation.sourceNote ?? ""}
                />
              </Field>
              <Button type="submit" className="self-start">
                保存并直接上架
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <ProductFeaturedAttributesForm
        productId={product.id}
        locale={locale}
        attributes={product.attributes.map((attribute) => ({
          id: attribute.id,
          key: attribute.definition.key,
          label:
            (attribute.definition.labels as Record<string, string>)[locale] ??
            attribute.definition.key,
          displayLabel:
            attribute.displayLabels &&
            typeof attribute.displayLabels === "object" &&
            !Array.isArray(attribute.displayLabels)
              ? (attribute.displayLabels as Record<string, string>)[locale]
              : undefined,
          value:
            attribute.textValue ??
            attribute.numberValue?.toString() ??
            (attribute.booleanValue == null
              ? "—"
              : String(attribute.booleanValue)),
          unit:
            attribute.unit ?? attribute.definition.standardUnit ?? undefined,
          featured: attribute.featured,
        }))}
      />

      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle>结构化参数</CardTitle>
          <CardDescription>
            人工保存的参数会标记为 MANUAL 并锁定；公网与 AI
            任务只能补充未锁定的低优先级字段。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {product.category.attributes.length ? (
            <div className="flex flex-col divide-y">
              {product.category.attributes.map((definition) => {
                const current = product.attributes.find(
                  (item) => item.definitionId === definition.id,
                );
                const currentValue =
                  current?.textValue ??
                  current?.numberValue?.toString() ??
                  (current?.booleanValue == null
                    ? undefined
                    : String(current.booleanValue));
                return (
                  <form
                    action={saveProductAttribute}
                    className="grid gap-4 py-5 md:grid-cols-[1fr_1.2fr_auto] md:items-end"
                    key={definition.id}
                  >
                    <input type="hidden" name="productId" value={product.id} />
                    <input
                      type="hidden"
                      name="definitionId"
                      value={definition.id}
                    />
                    <Field>
                      <FieldLabel htmlFor={`value-${definition.id}`}>
                        {(definition.labels as Record<string, string>).zh ??
                          definition.key}
                        {definition.required ? " *" : ""}
                      </FieldLabel>
                      {definition.type === "BOOLEAN" ? (
                        <Select name="value" defaultValue={currentValue}>
                          <SelectTrigger
                            id={`value-${definition.id}`}
                            className="w-full"
                          >
                            <SelectValue placeholder="选择" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="true">是</SelectItem>
                              <SelectItem value="false">否</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      ) : definition.type === "SELECT" ? (
                        <Select name="value" defaultValue={currentValue}>
                          <SelectTrigger
                            id={`value-${definition.id}`}
                            className="w-full"
                          >
                            <SelectValue placeholder="选择" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {options(definition.options).map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`value-${definition.id}`}
                          name="value"
                          inputMode={
                            definition.type === "NUMBER" ? "decimal" : undefined
                          }
                          defaultValue={currentValue}
                          required
                        />
                      )}
                      <FieldDescription>
                        {definition.key} · {current?.origin ?? "未填写"}
                        {current?.locked ? " · 已锁定" : ""}
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`unit-${definition.id}`}>
                        单位
                      </FieldLabel>
                      <Input
                        id={`unit-${definition.id}`}
                        name="unit"
                        defaultValue={
                          current?.unit ?? definition.standardUnit ?? ""
                        }
                        disabled={definition.type === "BOOLEAN"}
                      />
                    </Field>
                    <Button type="submit" variant="outline">
                      保存参数
                    </Button>
                  </form>
                );
              })}
            </div>
          ) : (
            <Alert>
              <AlertTitle>此分类尚无参数模板</AlertTitle>
              <AlertDescription>
                请先在“品牌、分类与参数”中创建参数定义。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle>产品素材管理与上传</CardTitle>
          <CardDescription>
            支持上传多张商品图片，并在上方或管理列表页随时一键设为主图。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-8">
            <ProductMediaUpload productId={product.id} />
            {product.media.length ? (
              <div className="flex flex-col divide-y">
                {product.media.map(({ asset }) => (
                  <div
                    className="grid gap-4 py-5 md:grid-cols-[1fr_auto] md:items-center"
                    key={asset.id}
                  >
                    <div>
                      <strong>{asset.originalName}</strong>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {asset.storageKey}
                        {product.primaryImageId === asset.id
                          ? " · 当前主图"
                          : ""}
                      </p>
                    </div>
                    {session.user.role === "ADMIN" && asset.kind === "IMAGE" ? (
                      <form action={reviewProductMedia}>
                        <input
                          type="hidden"
                          name="productId"
                          value={product.id}
                        />
                        <input type="hidden" name="assetId" value={asset.id} />
                        <input type="hidden" name="setPrimary" value="on" />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={product.primaryImageId === asset.id}
                        >
                          {product.primaryImageId === asset.id
                            ? "当前主图"
                            : "设为主图"}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
