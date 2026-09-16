import type { EditorialRichTextDocument } from "@/lib/editorial-rich-text";

export const locales = ["zh", "en", "ru", "fr", "de", "es", "ar"] as const;
export const coreLocales = ["zh", "en", "ru"] as const;
export type CoreLocale = (typeof coreLocales)[number];
export type Locale = (typeof locales)[number];
export type Role = "ADMIN" | "EDITOR";
export type PublishStatus = "DRAFT" | "NEEDS_REVIEW" | "READY" | "PUBLISHED" | "ARCHIVED";
export type ContentOrigin = "MANUAL" | "LOCAL_IMPORT" | "WEB_SOURCE" | "AI";
export type NewsCategory = "INDUSTRY_INSIGHTS" | "BUYING_GUIDE" | "TUTORIAL_GUIDE";

export interface LocalizedText {
  zh: string;
  en: string;
  ru: string;
  fr?: string;
  de?: string;
  es?: string;
  ar?: string;
}

export interface CategoryView {
  id: string;
  key: string;
  slug: string;
  path: string;
  name: string;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
  parentKey?: string;
  level: number;
  count: number;
  updatedAt?: string;
}

export interface ProductAttributeView {
  key: string;
  label: string;
  value: string;
  unit?: string;
  comparable: boolean;
}

export interface ProductImageView {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ProductCategoryTrailItem {
  key: string;
  name: string;
  path: string;
}


export interface ProductAlarmView {
  id: string;
  alarmCode: string;
  ledStatus: string;
  cause: string;
  procedure: string;
  severity: "CRITICAL" | "MAJOR" | "WARNING";
}

export interface ProductView {
  id: string;
  slug: string;
  model: string;
  sku?: string;
  brand: string;
  brandDisplayName?: string;
  brandId?: string;
  categoryKey: string;
  categoryName: string;
  categoryTrail?: ProductCategoryTrailItem[];
  name: string;
  directDefinition: string;
  shortDescription: string;
  whatItIs: string;
  problemSolved: string;
  suitableFor: string;
  advantages: string[];
  applications: string[];
  attributes: ProductAttributeView[];
  featuredAttributes?: ProductAttributeView[];
  faqs: Array<{ question: string; answer: string }>;
  image?: ProductImageView;
  images?: ProductImageView[];
  updatedAt: string;
  sourceNote?: string;
  seoTitle?: string;
  seoDescription?: string;
  alarms?: ProductAlarmView[];
}

/**
 * The deliberately small shape used by the product catalogue.  Detail pages
 * still use ProductView, but a catalogue page must not load FAQ, alarm and
 * full attribute relations for every product just to render twelve cards.
 */
export interface ProductListView {
  id: string;
  slug: string;
  model: string;
  sku?: string;
  brand: string;
  brandDisplayName?: string;
  categoryKey: string;
  categoryName: string;
  /** Optional searchable detail text; catalogue cards do not render it. */
  directDefinition?: string;
  categoryTrail?: ProductCategoryTrailItem[];
  name: string;
  shortDescription: string;
  image?: ProductImageView;
  attributes?: ProductAttributeView[];
}

export interface EditorialItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string[];
  richBody?: EditorialRichTextDocument;
  updatedAt: string;
  publishedAt?: string;
  authorName?: string;
  seoTitle?: string;
  seoDescription?: string;
  coverImage?: ProductImageView;
  newsCategory?: NewsCategory;
  relatedProductSlots?: Array<{ productId: string; sortOrder: number }>;
}
