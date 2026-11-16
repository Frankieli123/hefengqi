const unitAliases: Record<string, RegExp[]> = {
  w: [/\d\s*w\b/i, /Вт/i],
  kw: [/\d\s*kw\b/i, /кВт/i],
  va: [/\d\s*va\b/i, /ВА/i],
  kva: [/\d\s*kva\b/i, /кВА/i],
  a: [/\d\s*a\b/i, /\d\s*А\b/i, /安/],
  v: [/\d\s*v\b/i, /\d\s*В\b/i],
  vac: [/\bvac\b/i, /\bAC\b/i, /В\s*AC/i],
  vdc: [/\bvdc\b/i, /\bDC\b/i, /В\s*DC/i],
  hz: [/\bhz\b/i, /Гц/i],
  mm: [/\bmm\b/i, /мм/i],
  kg: [/\bkg\b/i, /кг/i],
  slots: [/槽位/, /\bslots?\b/i, /слот/i],
  "°c": [/°c/i, /℃/i, /°\s*c/i, /°/, /度/],
  "℃": [/°c/i, /℃/i, /°\s*c/i, /°/, /度/],
  "c": [/°c/i, /℃/i, /°\s*c/i],
  "%": [/%/i, /百分比/],
  "%rh": [/%rh/i, /%/],
  "dba": [/db\(?a\)?/i, /db\b/i, /дб/i],
  "db(a)": [/db\(?a\)?/i, /db\b/i, /дб/i],
  "db": [/db\b/i, /дб/i],
  "m³/h": [/m[³3]\/h/i, /м[³3]\/ч/i, /cfm/i],
  "m3/h": [/m[³3]\/h/i, /м[³3]\/ч/i, /cfm/i],
  hours: [/hours?\b/i, /hrs?\b/i, /\bh\b/i, /小时/, /часов/i],
  nm: [/nm\b/i, /нм/i],
  km: [/km\b/i, /км/i],
  gbps: [/gbps\b/i, /гбит/i],
  mbps: [/mbps\b/i, /мбит/i],
  dbm: [/dbm\b/i, /дбм/i],
};

export function formatAttributeValue(value: string, unit?: string): string {
  if (!unit) return value;
  const normalized = unit.trim().toLowerCase().replace(/\s+/g, "");
  const escaped = unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const defaultPattern = /[a-z0-9]/i.test(unit)
    ? new RegExp(`(?:\\b|\\d|\\s|^)${escaped}(?:\\b|\\s|$)`, "i")
    : new RegExp(escaped, "i");
  const aliases = unitAliases[normalized] ?? [defaultPattern];
  return aliases.some((pattern) => pattern.test(value)) ? value : `${value} ${unit}`;
}
