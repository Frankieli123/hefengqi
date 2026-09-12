const BRAND_CANONICAL_NAMES: Record<string, string> = {
  vertiv: "Vertiv",
  huawei: "Huawei",
  delta: "Delta",
  eltek: "Eltek",
  zte: "ZTE",
  santak: "Santak",
  kstar: "Kstar",
  eaton: "Eaton",
  cisco: "Cisco",
  nvidia: "NVIDIA",
  aten: "ATEN",
  rittal: "Rittal",
  stulz: "Stulz",
  envicool: "Envicool",
  accelink: "Accelink",
  raritan: "Raritan",
  adder: "Adder",
  hefengqi: "HEFENGQI",
};

export function formatBrandName(brand?: string | null): string {
  if (!brand) return "";
  const trimmed = brand.trim();
  const lower = trimmed.toLowerCase();
  if (BRAND_CANONICAL_NAMES[lower]) {
    return BRAND_CANONICAL_NAMES[lower];
  }
  return trimmed.replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}
