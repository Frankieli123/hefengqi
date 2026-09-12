import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EditorialDetail } from "@/components/editorial/editorial-detail";
import { JsonLd } from "@/components/json-ld";
import { getEditorial, getEditorialAlternatePaths, getProducts, getSlugRedirect } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { localizedMetadata, howToSchema } from "@/lib/seo";
import { env } from "@/lib/env";
import { selectNewsRelatedProducts } from "@/lib/news-related-products";
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale, slug } = await params; assertLocale(locale); const item = (await getEditorial(locale, "news")).find((entry) => entry.slug === slug); if (!item) return {}; const alternates = await getEditorialAlternatePaths("news", item.id); return localizedMetadata(locale, `/news/${slug}`, item.seoTitle ?? item.title, item.seoDescription ?? item.summary, false, alternates); }
export default async function Page({ params }: Props) { const { locale, slug } = await params; assertLocale(locale); const [items, products, common, productCopy] = await Promise.all([getEditorial(locale, "news"), getProducts(locale), getTranslations({ locale, namespace: "common" }), getTranslations({ locale, namespace: "products" })]); const item = items.find((entry) => entry.slug === slug); if (!item) { const moved = await getSlugRedirect(locale, `/news/${slug}`); if (moved) redirect(`/${locale}${moved}`); notFound(); } const recentItems = items.filter((entry) => entry.id !== item.id).slice(0, 5); const relatedProducts = selectNewsRelatedProducts(item, products); const tLower = item.title.toLowerCase(); const isGuide = item.title.includes("指南") || item.title.includes("实操") || item.title.includes("教程") || tLower.includes("guide") || tLower.includes("руковод") || tLower.includes("инструкц") || item.newsCategory === "TUTORIAL_GUIDE";

  const schemas: Array<Record<string, unknown>> = [
    {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: item.title,
      description: item.summary,
      datePublished: item.updatedAt,
      dateModified: item.updatedAt,
      ...(item.coverImage ? { image: [`${env.SITE_URL}${item.coverImage.src}`] } : {}),
      author: { "@type": "Organization", name: "HEFENGQI" },
      publisher: { "@type": "Organization", name: "HEFENGQI" }
    }
  ];

  if (isGuide) {
    schemas.push(howToSchema(locale, {
      name: item.title,
      description: item.summary,
      totalTime: "PT45M",
      supply: locale === "zh" ? ["光纤跳线 / 杜邦线", "工业连接器", "防护绝缘胶带"] : (locale === "ru" ? ["Оптический патч-корд", "Промышленный разъем", "Изоляционная лента"] : ["Optical Patch Cord", "Industrial Connector", "Insulation Tape"]),
      tool: locale === "zh" ? ["一字螺丝刀", "防静电手环", "数字万用表 / 光功率计"] : (locale === "ru" ? ["Отвертка", "Антистатический браслет", "Оптический тестер мощности"] : ["Screwdriver", "ESD Wrist Strap", "Digital Multimeter / Optical Power Meter"]),
      steps: [
        {
          name: locale === "zh" ? "步骤一：作业前准备与电气/激光安全检查" : (locale === "ru" ? "Шаг 1: Подготовка к работе и проверка безопасности" : "Step 1: Preparation & Safety Check"),
          text: locale === "zh" ? "严格按照操作规程断开母线高压输入或佩戴防静电防辐射护目设备，确认设备处于安全调试就绪状态。" : (locale === "ru" ? "Отключите высоковольтное питание или наденьте защитные средства, убедившись в безопасности." : "Isolate power supply or equip ESD/laser safety gear, ensuring the equipment is in a safe operational state.")
        },
        {
          name: locale === "zh" ? "步骤二：物理接口定位与精准对齐" : (locale === "ru" ? "Шаг 2: Позиционирование и совмещение интерфейсов" : "Step 2: Interface Alignment & Pin Verification"),
          text: locale === "zh" ? "根据官方电气或金手指数定义图表，逐一校对引脚脚位及收发端口对齐方向，避免反插或虚接。" : (locale === "ru" ? "Сверьтесь с официальной схемой распиновки и разъемами, соблюдая полярность и позиционирование." : "Check official pinout or port diagram, aligning Tx/Rx and contacts accurately to prevent misalignment.")
        },
        {
          name: locale === "zh" ? "步骤三：硬件互联、通信握手与参数配置" : (locale === "ru" ? "Шаг 3: Аппаратное подключение и настройка параметров" : "Step 3: Interconnection & Communication Handshake"),
          text: locale === "zh" ? "完成控制回路物理连接，通电进行协议协商或状态握手，实时监测控制器与指示灯反馈。" : (locale === "ru" ? "Выполните подключение цепи управления, подайте питание и отследите статус рукопожатия и индикацию." : "Complete physical loop connections, power on for protocol handshake, and monitor indicator feedback.")
        },
        {
          name: locale === "zh" ? "步骤四：电气输出/光功率测试与带载验证" : (locale === "ru" ? "Шаг 4: Измерение параметров и нагрузочное тестирование" : "Step 4: Power/Optical Output Measurement & Load Test"),
          text: locale === "zh" ? "使用专用仪器（万用表/光功率计）量测输出电压或收发光功率，确保其落在额定允许范围以内。" : (locale === "ru" ? "Измерьте выходные параметры приборами и убедитесь, что они находятся в допустимых пределах нормы." : "Measure output voltage or optical power with instruments, ensuring values strictly fall within nominal limits.")
        }
      ]
    }));
  }

  return <><JsonLd data={schemas} /><EditorialDetail locale={locale} item={item} recentItems={recentItems} relatedProducts={relatedProducts} productLabels={{ details: common("details"), inquiry: common("inquiry"), model: productCopy("model") }} homeLabel={common("home")} sectionLabel={common("news")} basePath="/news" /></>; }
