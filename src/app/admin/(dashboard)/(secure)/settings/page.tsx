import { saveHomeHeroSlides, updateAutomationSettings, updateAiApiKey, updateCustomerServiceSettings } from "@/app/admin/actions";
import { getAiApiKeyStatus } from "@/lib/api-auth";
import { BotIcon, KeyIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireSecureAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { homeHeroKeys, homeHeroLocales } from "@/lib/home-hero-schema";
import { customerServiceSettingsSchema } from "@/lib/customer-service";
import { env } from "@/lib/env";

export const metadata = { title: "站点设置", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ hero?: string; error?: string; saved?: string; aiKeyError?: string; customerService?: string; customerServiceError?: string }> };
type HeroLocale = typeof homeHeroLocales[number];

const defaultContent: Record<typeof homeHeroKeys[number], Record<HeroLocale, { eyebrow: string; title: string; summary: string; primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string; imageAlt: string }>> = {
  "home-hero-1": {
    zh: { eyebrow: "UPS 电源系统", title: "UPS 电源系统，为关键业务持续供电", summary: "面向数据中心、通信机房与关键设备，按容量、备电时间和部署条件整理 UPS 选型需求。", primaryLabel: "查看 UPS 产品", primaryHref: "/products/category/power/ups", secondaryLabel: "提交询价", secondaryHref: "/contact", imageAlt: "数据中心内的不间断电源机柜与配电基础设施" },
    en: { eyebrow: "UPS power systems", title: "UPS power systems for continuously operating critical services", summary: "Structure UPS requirements by capacity, backup duration, and deployment conditions for data centers, telecom rooms, and critical equipment.", primaryLabel: "Explore UPS products", primaryHref: "/products/category/power/ups", secondaryLabel: "Request a quote", secondaryHref: "/contact", imageAlt: "Uninterruptible power cabinets and distribution infrastructure inside a data center" },
    ru: { eyebrow: "Системы UPS", title: "Системы UPS для непрерывной работы критически важных служб", summary: "Подбор UPS по мощности, времени резерва и условиям размещения для ЦОД, узлов связи и критического оборудования.", primaryLabel: "Посмотреть системы UPS", primaryHref: "/products/category/power/ups", secondaryLabel: "Запросить предложение", secondaryHref: "/contact", imageAlt: "Шкафы бесперебойного питания и распределительная инфраструктура в центре обработки данных" },
  },
  "home-hero-2": {
    zh: { eyebrow: "精密空调", title: "精密空调，稳定关键设备运行环境", summary: "围绕制冷量、气流组织、场地空间与运行条件，协助数据机房和通信设备间完成精密空调选型。", primaryLabel: "查看精密空调", primaryHref: "/products/category/thermal-management/precision-air-conditioning", secondaryLabel: "联系我们", secondaryHref: "/contact", imageAlt: "数据中心机房内的精密空调与服务器机柜" },
    en: { eyebrow: "Precision air conditioning", title: "Precision cooling for stable critical equipment environments", summary: "Select precision air conditioning around cooling capacity, airflow, available space, and operating conditions for data and telecom facilities.", primaryLabel: "Explore precision cooling", primaryHref: "/products/category/thermal-management/precision-air-conditioning", secondaryLabel: "Contact us", secondaryHref: "/contact", imageAlt: "Precision cooling equipment and server cabinets inside a data center" },
    ru: { eyebrow: "Прецизионное кондиционирование", title: "Прецизионное охлаждение для стабильной работы оборудования", summary: "Подбор кондиционирования по холодопроизводительности, воздушным потокам, площади и условиям эксплуатации ЦОД и узлов связи.", primaryLabel: "Прецизионные кондиционеры", primaryHref: "/products/category/thermal-management/precision-air-conditioning", secondaryLabel: "Связаться с нами", secondaryHref: "/contact", imageAlt: "Прецизионное охлаждение и серверные шкафы в центре обработки данных" },
  },
  "home-hero-3": {
    zh: { eyebrow: "直流电源", title: "直流电源系统，让通信供电更可靠", summary: "覆盖整流、配电、监控与备电链路，帮助通信站点和网络机房按负载与安装条件整理配置。", primaryLabel: "查看直流电源", primaryHref: "/products/category/power/dc-power-systems", secondaryLabel: "提交询价", secondaryHref: "/contact", imageAlt: "通信机房内的直流电源机柜、整流模块和配电设备" },
    en: { eyebrow: "DC power", title: "Reliable DC power systems for communications infrastructure", summary: "Coordinate rectification, distribution, monitoring, and backup around load and installation conditions for telecom sites and network rooms.", primaryLabel: "Explore DC power", primaryHref: "/products/category/power/dc-power-systems", secondaryLabel: "Request a quote", secondaryHref: "/contact", imageAlt: "DC power cabinets, rectifier modules, and distribution equipment in a telecom facility" },
    ru: { eyebrow: "Системы постоянного тока", title: "Надёжные системы постоянного тока для инфраструктуры связи", summary: "Комплектация выпрямления, распределения, мониторинга и резерва с учётом нагрузки и условий монтажа на объектах связи.", primaryLabel: "Системы постоянного тока", primaryHref: "/products/category/power/dc-power-systems", secondaryLabel: "Запросить предложение", secondaryHref: "/contact", imageAlt: "Шкафы постоянного тока, выпрямительные модули и распределительное оборудование на объекте связи" },
  },
  "home-hero-4": {
    zh: { eyebrow: "SFP 光模块", title: "SFP 光模块，连接网络的关键链路", summary: "面向交换机、路由器与传输设备，按速率、波长、距离、接口和兼容需求定位合适的 SFP 光模块。", primaryLabel: "查看 SFP 光模块", primaryHref: "/products/category/optical-communications/sfp-modules", secondaryLabel: "联系我们", secondaryHref: "/contact", imageAlt: "机房光纤链路与网络设备中的 SFP 光模块" },
    en: { eyebrow: "SFP optical transceivers", title: "SFP optical transceivers for essential network links", summary: "Identify suitable SFP modules for switches, routers, and transport equipment by rate, wavelength, distance, connector, and compatibility.", primaryLabel: "Explore SFP modules", primaryHref: "/products/category/optical-communications/sfp-modules", secondaryLabel: "Contact us", secondaryHref: "/contact", imageAlt: "SFP optical transceivers connecting fiber links and network equipment" },
    ru: { eyebrow: "Оптические модули SFP", title: "Модули SFP для ключевых сетевых каналов", summary: "Подбор SFP для коммутаторов, маршрутизаторов и транспортного оборудования по скорости, длине волны, дальности, разъёму и совместимости.", primaryLabel: "Посмотреть модули SFP", primaryHref: "/products/category/optical-communications/sfp-modules", secondaryLabel: "Связаться с нами", secondaryHref: "/contact", imageAlt: "Оптические модули SFP в волоконных линиях и сетевом оборудовании" },
  },
};

const selectClass = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function Page({ searchParams }: Props) {
  await requireSecureAdmin("ADMIN");
  const query = await searchParams;
  const [automation, slides, assets, apiKeyStatus, customerServiceSetting] = await Promise.all([
    db.siteSetting.findUnique({ where: { key: "automation" } }),
    db.homeHeroSlide.findMany({ include: { translations: true }, orderBy: { sortOrder: "asc" } }),
    db.mediaAsset.findMany({ where: { kind: "IMAGE", scanStatus: "CLEAN", rightsApproved: true }, select: { id: true, originalName: true, width: true, height: true }, orderBy: { createdAt: "desc" } }),
    getAiApiKeyStatus(),
    db.siteSetting.findUnique({ where: { key: "customerService" } }),
  ]);
  const automationValue = automation?.value as { autoPublish?: boolean } | undefined;
  const customerService = customerServiceSettingsSchema.safeParse(customerServiceSetting?.value).success
    ? customerServiceSettingsSchema.parse(customerServiceSetting?.value)
    : customerServiceSettingsSchema.parse({});
  const slideByKey = new Map(slides.map((slide) => [slide.key, slide]));

  return <main className="flex flex-col gap-8 p-5 md:p-8">
    <div><h1 className="text-2xl font-semibold">系统设置</h1><p className="mt-2 text-sm text-muted-foreground">首页内容、媒体与自动化开关。密钥仅通过服务器环境文件配置，不在后台回显。</p></div>

    {query.saved === "ai-key" ? <Alert><AlertTitle>AI API Key 已更新</AlertTitle><AlertDescription>新密钥已保存并立即生效，外部 AI 脚本可直接使用该密钥调用产品上传接口。</AlertDescription></Alert> : null}
    {query.aiKeyError === "environment-managed" ? <Alert variant="destructive"><AlertTitle>API Key 由服务器环境管理</AlertTitle><AlertDescription>当前设置了 AI_API_KEY 环境变量。请在服务器环境中更新并重启应用，后台不会覆盖该值。</AlertDescription></Alert> : null}
    {query.hero ? <Alert><AlertTitle>首页 Hero 已保存</AlertTitle><AlertDescription>三语首页已重新验证，新配置会使用已批准的媒体版本。</AlertDescription></Alert> : null}
    {query.customerService ? <Alert><AlertTitle>在线客服设置已保存</AlertTitle><AlertDescription>前台状态、联系方式和三语提示已更新。</AlertDescription></Alert> : null}
    {query.customerServiceError ? <Alert variant="destructive"><AlertTitle>在线客服设置未保存</AlertTitle><AlertDescription>请检查邮箱格式；启用 Webhook 时必须填写公网 HTTPS URL，并设置至少 16 个字符的签名密钥。</AlertDescription></Alert> : null}
    {query.error ? <Alert variant="destructive"><AlertTitle>Hero 配置未保存</AlertTitle><AlertDescription>{query.error === "hero-media-not-approved" ? "所选图片不存在、未通过扫描或尚未确认授权。请先到媒体库完成复核。" : "请检查四张 Hero 的排序、焦点范围、三语文案、站内链接和图片配置。"}</AlertDescription></Alert> : null}

    <section id="home-hero" className="scroll-mt-20">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">首页 Hero</h2><p className="mt-1 text-sm text-muted-foreground">最多启用 4 张。桌面图必填，移动图可选；只有已扫描并确认授权的图片可被选择。</p></div><Button variant="outline" render={<a href="/admin/media" />}>打开媒体库</Button></div>
      <form action={saveHomeHeroSlides}><FieldGroup className="gap-6">
        {homeHeroKeys.map((key, index) => {
          const slide = slideByKey.get(key);
          const translations = new Map(slide?.translations.map((translation) => [translation.locale, translation]));
          return <Card key={key} className="bg-background"><CardHeader><CardTitle>Hero {index + 1}</CardTitle><CardDescription>{index === 0 ? "首张图片是页面 LCP 资源，并承载首页唯一 H1。" : "非首张图片将在页面加载完成后预载，再参与自动轮播。"}</CardDescription></CardHeader><CardContent><FieldGroup>
            <div className="grid gap-5 md:grid-cols-3"><Field orientation="horizontal"><Checkbox id={`slide${index}Enabled`} name={`slide${index}Enabled`} defaultChecked={slide?.enabled ?? false} /><div><FieldLabel htmlFor={`slide${index}Enabled`}>启用此 Hero</FieldLabel><FieldDescription>启用时必须完成三语与桌面图。</FieldDescription></div></Field><Field><FieldLabel htmlFor={`slide${index}SortOrder`}>显示顺序</FieldLabel><select id={`slide${index}SortOrder`} name={`slide${index}SortOrder`} defaultValue={slide?.sortOrder ?? index} className={selectClass}>{homeHeroKeys.map((_, position) => <option key={position} value={position}>第 {position + 1} 张</option>)}</select></Field></div>
            <div className="grid gap-5 md:grid-cols-2"><Field><FieldLabel htmlFor={`slide${index}DesktopAssetId`}>桌面图片</FieldLabel><select id={`slide${index}DesktopAssetId`} name={`slide${index}DesktopAssetId`} defaultValue={slide?.desktopAssetId ?? ""} className={selectClass}><option value="">未选择</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.originalName} · {asset.width ?? "?"}×{asset.height ?? "?"}</option>)}</select></Field><Field><FieldLabel htmlFor={`slide${index}MobileAssetId`}>移动图片（选填）</FieldLabel><select id={`slide${index}MobileAssetId`} name={`slide${index}MobileAssetId`} defaultValue={slide?.mobileAssetId ?? ""} className={selectClass}><option value="">沿用桌面图片</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.originalName} · {asset.width ?? "?"}×{asset.height ?? "?"}</option>)}</select></Field></div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{(["DesktopFocusX", "DesktopFocusY", "MobileFocusX", "MobileFocusY"] as const).map((field) => {
              const label = { DesktopFocusX: "桌面焦点 X", DesktopFocusY: "桌面焦点 Y", MobileFocusX: "移动焦点 X", MobileFocusY: "移动焦点 Y" }[field];
              const value = { DesktopFocusX: slide?.desktopFocusX ?? 72, DesktopFocusY: slide?.desktopFocusY ?? 50, MobileFocusX: slide?.mobileFocusX ?? 50, MobileFocusY: slide?.mobileFocusY ?? 70 }[field];
              return <Field key={field}><FieldLabel htmlFor={`slide${index}${field}`}>{label}</FieldLabel><Input id={`slide${index}${field}`} name={`slide${index}${field}`} type="number" inputMode="numeric" min={0} max={100} defaultValue={value} /><FieldDescription>0–100%</FieldDescription></Field>;
            })}</div>
            <div className="grid gap-4">{homeHeroLocales.map((locale) => {
              const saved = translations.get(locale);
              const defaults = defaultContent[key][locale];
              const prefix = `slide${index}${locale}`;
              return <details key={locale} open={locale === "zh"} className="rounded-lg border bg-card p-4"><summary className="cursor-pointer font-medium">{locale.toUpperCase()} 文案</summary><FieldGroup className="mt-5"><div className="grid gap-5 md:grid-cols-2"><Field><FieldLabel htmlFor={`${prefix}Eyebrow`}>眉题</FieldLabel><Input id={`${prefix}Eyebrow`} name={`${prefix}Eyebrow`} defaultValue={saved?.eyebrow || defaults.eyebrow} maxLength={80} /></Field><Field><FieldLabel htmlFor={`${prefix}ImageAlt`}>图片替代文本</FieldLabel><Input id={`${prefix}ImageAlt`} name={`${prefix}ImageAlt`} defaultValue={saved?.imageAlt || defaults.imageAlt} maxLength={180} /></Field></div><Field><FieldLabel htmlFor={`${prefix}Title`}>标题</FieldLabel><Input id={`${prefix}Title`} name={`${prefix}Title`} defaultValue={saved?.title || defaults.title} maxLength={160} /></Field><Field><FieldLabel htmlFor={`${prefix}Summary`}>摘要</FieldLabel><Textarea id={`${prefix}Summary`} name={`${prefix}Summary`} defaultValue={saved?.summary || defaults.summary} maxLength={500} rows={3} /></Field><div className="grid gap-5 md:grid-cols-2"><Field><FieldLabel htmlFor={`${prefix}PrimaryLabel`}>主按钮文字</FieldLabel><Input id={`${prefix}PrimaryLabel`} name={`${prefix}PrimaryLabel`} defaultValue={saved?.primaryLabel || defaults.primaryLabel} maxLength={60} /></Field><Field><FieldLabel htmlFor={`${prefix}PrimaryHref`}>主按钮站内链接</FieldLabel><Input id={`${prefix}PrimaryHref`} name={`${prefix}PrimaryHref`} defaultValue={saved?.primaryHref || defaults.primaryHref} placeholder="/products" maxLength={300} /></Field><Field><FieldLabel htmlFor={`${prefix}SecondaryLabel`}>次按钮文字（选填）</FieldLabel><Input id={`${prefix}SecondaryLabel`} name={`${prefix}SecondaryLabel`} defaultValue={saved?.secondaryLabel ?? defaults.secondaryLabel} maxLength={60} /></Field><Field><FieldLabel htmlFor={`${prefix}SecondaryHref`}>次按钮站内链接（选填）</FieldLabel><Input id={`${prefix}SecondaryHref`} name={`${prefix}SecondaryHref`} defaultValue={saved?.secondaryHref ?? defaults.secondaryHref} placeholder="/contact" maxLength={300} /></Field></div></FieldGroup></details>;
            })}</div>
          </FieldGroup></CardContent></Card>;
        })}
        <Button type="submit" className="self-start">保存首页 Hero</Button>
      </FieldGroup></form>
    </section>

    <section id="customer-service" className="flex scroll-mt-20 flex-col gap-5">
      <div><h2 className="text-xl font-semibold">在线客服</h2><p className="mt-1 text-sm text-muted-foreground">控制右下角客服入口和真实会话状态。客服在线时可在“在线客服”收件箱中直接回复访客。</p></div>
      {!env.RESEND_API_KEY ? <Alert variant="destructive"><AlertTitle>邮件发送服务尚未启用</AlertTitle><AlertDescription>可以在下方设置收件与发件地址，但服务器尚未配置 RESEND_API_KEY，因此询价确认邮件暂时不会发出。密钥属于服务器机密，不在网页后台保存或回显。</AlertDescription></Alert> : <Alert><AlertTitle>邮件发送服务已连接</AlertTitle><AlertDescription>下方保存的发件人名称和发件地址将用于后续询价确认邮件。</AlertDescription></Alert>}
      <Card className="max-w-4xl"><CardContent className="pt-6"><form action={updateCustomerServiceSettings}><FieldGroup>
        <div className="grid gap-5 md:grid-cols-2"><Field orientation="horizontal"><Checkbox id="customerServiceEnabled" name="customerServiceEnabled" defaultChecked={customerService.enabled} /><div><FieldLabel htmlFor="customerServiceEnabled">启用在线客服入口</FieldLabel><FieldDescription>关闭后前台不显示悬浮客服入口。</FieldDescription></div></Field><Field orientation="horizontal"><Checkbox id="customerServiceOperatorOnline" name="customerServiceOperatorOnline" defaultChecked={customerService.operatorOnline} /><div><FieldLabel htmlFor="customerServiceOperatorOnline">客服在线，可实时回复</FieldLabel><FieldDescription>离线时仍可留言，访客会看到离线提示和 WhatsApp 联系方式。</FieldDescription></div></Field></div>
        <div className="grid gap-5 md:grid-cols-3"><Field><FieldLabel htmlFor="customerServiceEmail">访客联系/询价收件邮箱</FieldLabel><Input id="customerServiceEmail" name="customerServiceEmail" type="email" defaultValue={customerService.email} required /><FieldDescription>前台显示此地址，同时接收官网询价。</FieldDescription></Field><Field><FieldLabel htmlFor="customerServicePhone">电话</FieldLabel><Input id="customerServicePhone" name="customerServicePhone" defaultValue={customerService.phone} required /></Field><Field><FieldLabel htmlFor="customerServiceWhatsapp">WhatsApp 号码</FieldLabel><Input id="customerServiceWhatsapp" name="customerServiceWhatsapp" defaultValue={customerService.whatsapp} required /><FieldDescription>仅数字，例如 8617621197907。</FieldDescription></Field></div>
        <div className="grid gap-5 md:grid-cols-2"><Field><FieldLabel htmlFor="customerServiceSenderName">邮件发件人名称</FieldLabel><Input id="customerServiceSenderName" name="customerServiceSenderName" defaultValue={customerService.senderName} required /></Field><Field><FieldLabel htmlFor="customerServiceSenderEmail">邮件发件地址</FieldLabel><Input id="customerServiceSenderEmail" name="customerServiceSenderEmail" type="email" defaultValue={customerService.senderEmail} required /><FieldDescription>用于询价确认邮件；域名需在 Resend 中完成验证。</FieldDescription></Field></div>
        <div className="rounded-lg bg-muted p-4"><p className="text-sm font-medium">Webhook 消息推送</p><p className="mt-1 text-xs leading-5 text-muted-foreground">访客留言和后台回复都会向目标地址发送 JSON。请求头包含事件类型和 HMAC-SHA256 签名。</p><div className="mt-4 grid gap-5 md:grid-cols-2"><Field orientation="horizontal"><Checkbox id="customerServiceWebhookEnabled" name="customerServiceWebhookEnabled" defaultChecked={customerService.webhookEnabled} /><div><FieldLabel htmlFor="customerServiceWebhookEnabled">启用 Webhook</FieldLabel><FieldDescription>目标接口异常不会阻塞站内消息。</FieldDescription></div></Field><Field><FieldLabel htmlFor="customerServiceWebhookUrl">Webhook URL</FieldLabel><Input id="customerServiceWebhookUrl" name="customerServiceWebhookUrl" type="url" defaultValue={customerService.webhookUrl} placeholder="https://example.com/webhooks/ricewind" /></Field><Field className="md:col-span-2"><FieldLabel htmlFor="customerServiceWebhookSecret">签名密钥</FieldLabel><Input id="customerServiceWebhookSecret" name="customerServiceWebhookSecret" type="password" placeholder={customerService.webhookSecret ? "已配置；留空保持不变" : "输入独立的随机密钥"} autoComplete="new-password" /><FieldDescription>签名位于 <code>X-RICEWIND-Signature: sha256=...</code>；后台不回显已有密钥。</FieldDescription></Field></div></div>
        <div className="grid gap-5 md:grid-cols-3"><Field><FieldLabel htmlFor="customerServiceWelcomeZh">在线欢迎语（中文）</FieldLabel><Textarea id="customerServiceWelcomeZh" name="customerServiceWelcomeZh" defaultValue={customerService.welcomeMessage.zh} rows={3} required /></Field><Field><FieldLabel htmlFor="customerServiceWelcomeEn">在线欢迎语（English）</FieldLabel><Textarea id="customerServiceWelcomeEn" name="customerServiceWelcomeEn" defaultValue={customerService.welcomeMessage.en} rows={3} required /></Field><Field><FieldLabel htmlFor="customerServiceWelcomeRu">在线欢迎语（Русский）</FieldLabel><Textarea id="customerServiceWelcomeRu" name="customerServiceWelcomeRu" defaultValue={customerService.welcomeMessage.ru} rows={3} required /></Field></div>
        <div className="grid gap-5 md:grid-cols-3"><Field><FieldLabel htmlFor="customerServiceOfflineZh">离线提示（中文）</FieldLabel><Textarea id="customerServiceOfflineZh" name="customerServiceOfflineZh" defaultValue={customerService.offlineMessage.zh} rows={3} required /></Field><Field><FieldLabel htmlFor="customerServiceOfflineEn">离线提示（English）</FieldLabel><Textarea id="customerServiceOfflineEn" name="customerServiceOfflineEn" defaultValue={customerService.offlineMessage.en} rows={3} required /></Field><Field><FieldLabel htmlFor="customerServiceOfflineRu">离线提示（Русский）</FieldLabel><Textarea id="customerServiceOfflineRu" name="customerServiceOfflineRu" defaultValue={customerService.offlineMessage.ru} rows={3} required /></Field></div>
        <Button type="submit" className="self-start">保存在线客服设置</Button>
      </FieldGroup></form></CardContent></Card>
    </section>

    <section className="flex flex-col gap-5"><div><h2 className="text-xl font-semibold">自动化发布</h2><p className="mt-1 text-sm text-muted-foreground">仅影响通过全部内容门禁的后台任务。</p></div><Alert><AlertTitle>自动发布仍受硬门禁保护</AlertTitle><AlertDescription>即使开启，三语完整度、必填参数、唯一标识、来源证据与主图授权任一不通过，内容仍进入 NEEDS_REVIEW。</AlertDescription></Alert><form action={updateAutomationSettings} className="max-w-2xl rounded-lg border bg-card p-6"><FieldGroup><Field orientation="horizontal"><Checkbox id="autoPublish" name="autoPublish" defaultChecked={automationValue?.autoPublish === true} /><div><FieldLabel htmlFor="autoPublish">允许验证通过的任务自动发布</FieldLabel><FieldDescription>全局开关；来源和分类仍可单独关闭。</FieldDescription></div></Field><Button type="submit" className="self-start">保存自动化设置</Button></FieldGroup></form></section>
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BotIcon className="size-5 text-primary" />
          AI API 接入与密钥管理
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          供外部大语言模型或自动化工作流调用 <code>POST /api/admin/products</code> 批量上传产品、三语说明及规格参数。
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyIcon className="size-4" />
            当前 API Key
          </CardTitle>
          <CardDescription>
            支持在环境变量 <code>AI_API_KEY</code> 中预设，或在此处保存安全摘要。外部调用时请在 HTTP 请求头中提供 <code>Authorization: Bearer &lt;KEY&gt;</code> 或 <code>x-api-key: &lt;KEY&gt;</code>。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateAiApiKey} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="apiKey">AI 接口调用密钥 (API Key)</FieldLabel>
              <Input id="apiKey" name="apiKey" type="password" required minLength={32} autoComplete="new-password" placeholder="输入新的密钥（至少 32 个字符）" disabled={apiKeyStatus.source === "environment"} />
              <FieldDescription>
                {apiKeyStatus.configured
                  ? `已配置（${apiKeyStatus.source === "environment" ? "服务器环境变量" : apiKeyStatus.source === "database" ? "后台安全摘要" : "仅限本地开发的默认密钥"}），现有密钥不会回显。`
                  : "尚未配置 API Key。保存后请立即将原始密钥存入密码管理器。"}
              </FieldDescription>
            </Field>
            <Button type="submit" className="self-start" disabled={apiKeyStatus.source === "environment"}>保存并更新 API Key</Button>
          </form>

          <div className="mt-6 rounded-lg bg-muted p-4 text-xs font-mono">
            <p className="font-semibold text-foreground mb-2"># 快速测试产品上传命令 (cURL)</p>
            <pre className="overflow-x-auto whitespace-pre-wrap">{`curl -X POST http://localhost:3000/api/admin/products \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "ZXDU68 S501",
    "brand": "zte",
    "category": "zte",
    "translations": {
      "zh": {
        "name": "中兴 ZXDU68 S501 嵌入式直流电源系统",
        "directDefinition": "ZXDU68 S501 是一款高效嵌入式通信直流电源系统，为通信宏基站与核心机房提供稳定供电。",
        "whatItIs": "标准 19 英寸机架安装电源系统，内置高效率整流模块与集中监控单元。",
        "problemSolved": "解决站点供电能耗高、机架空间不足与电池备电状态难以实时监测的问题。"
      }
    },
    "attributes": [
      { "key": "nominal-voltage", "value": "-48V", "unit": "VDC" },
      { "key": "efficiency", "value": "96.5", "unit": "%" }
    ]
  }'`}</pre>
          </div>
        </CardContent>
      </Card>
    </section>

  </main>;
}
