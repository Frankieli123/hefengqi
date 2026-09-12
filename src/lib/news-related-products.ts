import type { EditorialItem, ProductView } from "@/types/domain";

const ignoredKeywords = new Set([
  "and", "for", "the", "with", "from", "this", "that", "into",
  "для", "или", "при", "это", "как", "под", "над",
  "产品", "设备", "系统", "方案", "应用", "中心",
]);

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replaceAll(/[\s\p{P}\p{S}]+/gu, "");
}

function keywords(value: string) {
  const result = new Set<string>();
  const segments = value.normalize("NFKC").toLocaleLowerCase().match(/[\p{Script=Han}]+|[\p{L}\p{N}]+/gu) ?? [];

  for (const segment of segments) {
    if (/^\p{Script=Han}+$/u.test(segment)) {
      if (segment.length <= 4 && segment.length >= 2 && !ignoredKeywords.has(segment)) result.add(segment);
      for (let index = 0; index < segment.length - 1; index += 1) {
        const keyword = segment.slice(index, index + 2);
        if (!ignoredKeywords.has(keyword)) result.add(keyword);
      }
    } else if (segment.length >= 2 && !ignoredKeywords.has(segment)) {
      result.add(segment);
    }
  }

  return result;
}

function phraseMatchScore(corpus: string, value: string | undefined, score: number) {
  if (!value) return 0;
  const phrase = normalize(value);
  return phrase.length >= 2 && corpus.includes(phrase) ? score : 0;
}

function overlapScore(articleKeywords: Set<string>, value: string, weight: number) {
  let score = 0;
  for (const keyword of keywords(value)) if (articleKeywords.has(keyword)) score += weight;
  return score;
}

export function scoreNewsProduct(item: EditorialItem, product: ProductView) {
  const articleText = [item.title, item.summary, ...item.body].join(" ");
  const corpus = normalize(articleText);
  const articleKeywords = keywords(articleText);
  const categoryNames = [product.categoryName, ...(product.categoryTrail?.map((category) => category.name) ?? [])];

  let score = 0;
  score += phraseMatchScore(corpus, product.name, 180);
  score += phraseMatchScore(corpus, product.model, 160);
  score += phraseMatchScore(corpus, product.brand, 110);
  for (const category of categoryNames) score += phraseMatchScore(corpus, category, 80);

  score += overlapScore(articleKeywords, `${product.name} ${product.model}`, 18);
  score += overlapScore(articleKeywords, product.brand, 14);
  score += overlapScore(articleKeywords, categoryNames.join(" "), 12);
  score += overlapScore(articleKeywords, `${product.shortDescription} ${product.directDefinition}`, 2);
  return score;
}

export function selectNewsRelatedProducts(item: EditorialItem, products: ProductView[], limit = 4) {
  const safeLimit = Math.max(0, Math.min(4, limit));
  const productsById = new Map(products.map((product) => [product.id, product]));
  const manualByPosition = new Map<number, ProductView>();
  const selectedIds = new Set<string>();

  for (const slot of item.relatedProductSlots ?? []) {
    const product = productsById.get(slot.productId);
    if (!product || selectedIds.has(product.id) || slot.sortOrder < 0 || slot.sortOrder >= safeLimit || manualByPosition.has(slot.sortOrder)) continue;
    manualByPosition.set(slot.sortOrder, product);
    selectedIds.add(product.id);
  }

  const automatic = products
    .map((product, index) => ({ product, index, score: scoreNewsProduct(item, product) }))
    .filter(({ product }) => !selectedIds.has(product.id))
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const result: ProductView[] = [];
  let automaticIndex = 0;
  for (let position = 0; position < safeLimit; position += 1) {
    const manual = manualByPosition.get(position);
    if (manual) {
      result.push(manual);
      continue;
    }
    const automaticProduct = automatic[automaticIndex]?.product;
    if (!automaticProduct) break;
    result.push(automaticProduct);
    automaticIndex += 1;
  }

  return result;
}
