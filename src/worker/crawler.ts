import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import type { IncomingHttpHeaders } from "node:http";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import { z } from "zod";
import { env } from "@/lib/env";

const crawlerAgent = "HEFENGQI-ContentBot/1.0 (+public-site-contact)";

function unsafeIpv4(ip: string) {
  const bytes = ip.split(".").map(Number); if (bytes.length !== 4 || bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) return true;
  return bytes[0] === 10 || bytes[0] === 127 || bytes[0] === 0 || (bytes[0] === 100 && bytes[1] >= 64 && bytes[1] <= 127) || (bytes[0] === 169 && bytes[1] === 254) || (bytes[0] === 172 && bytes[1] >= 16 && bytes[1] <= 31) || (bytes[0] === 192 && bytes[1] === 168) || (bytes[0] === 198 && (bytes[1] === 18 || bytes[1] === 19)) || bytes[0] >= 224;
}

function unsafeAddress(address: string) {
  const family = isIP(address); const lower = address.toLowerCase();
  if (family === 4) return unsafeIpv4(address);
  if (family !== 6 || lower === "::" || lower === "::1" || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) return unsafeIpv4(lower.slice(7));
  return false;
}

async function resolveSafeUrl(value: string, allowedHosts: string[]) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || !allowedHosts.includes(url.hostname.toLowerCase())) throw new Error("URL_NOT_ALLOWED");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("DNS_EMPTY");
  if (addresses.some(({ address }) => unsafeAddress(address))) throw new Error("PRIVATE_ADDRESS");
  return { url, address: addresses[0]!.address, family: addresses[0]!.family };
}

export async function assertSafeUrl(value: string, allowedHosts: string[]) {
  return (await resolveSafeUrl(value, allowedHosts)).url;
}

async function pinnedGet(value: string, allowedHosts: string[], maxBytes: number, timeoutMs: number) {
  const { url, address, family } = await resolveSafeUrl(value, allowedHosts);
  return new Promise<{ status: number; headers: IncomingHttpHeaders; buffer: Buffer; url: URL }>((resolve, reject) => {
    const request = httpsRequest({ protocol: "https:", hostname: address, family, port: url.port || 443, path: `${url.pathname}${url.search}`, servername: url.hostname, method: "GET", headers: { Host: url.host, "User-Agent": crawlerAgent, Accept: "text/html,text/plain;q=0.9" }, timeout: timeoutMs }, (response) => {
      const declared = Number(response.headers["content-length"] ?? "0");
      if (declared > maxBytes) { request.destroy(new Error("RESPONSE_TOO_LARGE")); return; }
      const chunks: Buffer[] = []; let received = 0;
      response.on("data", (chunk: Buffer) => { received += chunk.length; if (received > maxBytes) request.destroy(new Error("RESPONSE_TOO_LARGE")); else chunks.push(chunk); });
      response.on("end", () => resolve({ status: response.statusCode ?? 0, headers: response.headers, buffer: Buffer.concat(chunks), url }));
    });
    request.on("timeout", () => request.destroy(new Error("REQUEST_TIMEOUT")));
    request.on("error", reject);
    request.end();
  });
}

export async function fetchStaticHtml(value: string, allowedHosts: string[], maxBytes: number) {
  let current = value;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const response = await pinnedGet(current, allowedHosts, maxBytes, 12_000);
    if (response.status >= 300 && response.status < 400) { const location = response.headers.location; if (!location) throw new Error("REDIRECT_WITHOUT_LOCATION"); current = new URL(location, response.url).toString(); continue; }
    if (response.status < 200 || response.status >= 300) throw new Error(`HTTP_${response.status}`);
    const type = response.headers["content-type"] ?? ""; if (!type.includes("text/html")) throw new Error("INVALID_CONTENT_TYPE");
    return { url: response.url.toString(), html: new TextDecoder().decode(response.buffer), hash: createHash("sha256").update(response.buffer).digest("hex") };
  }
  throw new Error("TOO_MANY_REDIRECTS");
}

export async function robotsAllows(value: string, allowedHosts: string[]) {
  const target = await assertSafeUrl(value, allowedHosts); const robotsUrl = new URL("/robots.txt", target);
  const response = await pinnedGet(robotsUrl.toString(), allowedHosts, 512_000, 8_000);
  if (response.status === 404) return true; if (response.status < 200 || response.status >= 300) throw new Error(`ROBOTS_HTTP_${response.status}`);
  const groups: Array<{ agents: string[]; rules: Array<{ kind: "allow" | "disallow"; path: string }> }> = []; let group: (typeof groups)[number] | undefined;
  for (const rawLine of response.buffer.toString("utf8").split(/\r?\n/)) {
    const line = rawLine.split("#")[0]?.trim() ?? ""; if (!line) continue;
    const [rawKey, ...rest] = line.split(":"); const key = rawKey?.trim().toLowerCase(); const rule = rest.join(":").trim();
    if (key === "user-agent") { if (!group || group.rules.length) { group = { agents: [], rules: [] }; groups.push(group); } group.agents.push(rule.toLowerCase()); }
    else if ((key === "allow" || key === "disallow") && group && rule) group.rules.push({ kind: key, path: rule });
  }
  const rules = groups.filter((item) => item.agents.some((agent) => agent === "*" || agent === "hefengqi-contentbot")).flatMap((item) => item.rules).filter((rule) => target.pathname.startsWith(rule.path)).sort((a, b) => b.path.length - a.path.length || (a.kind === "allow" ? -1 : 1));
  return rules[0]?.kind !== "disallow";
}

const translatedFactSchema = z.object({ label: z.string(), value: z.string() });
const extractionSchema = z.object({
  model: z.string().nullable(), brand: z.string().nullable(), title: z.string().nullable(),
  facts: z.array(z.object({ label: z.string(), value: z.string(), sourceQuote: z.string(), translations: z.object({ zh: translatedFactSchema, en: translatedFactSchema, ru: translatedFactSchema }).optional() })).max(50),
  warnings: z.array(z.string()),
});

function normalizedEvidence(value: string) { return value.replaceAll(/\s+/g, " ").trim(); }
function protectedTokens(value: string) { return value.match(/(?:[\p{L}]*\d[\p{L}\p{N}._/+%-]*|\d+(?:[.,]\d+)?)/gu)?.toSorted() ?? []; }

export async function extractPublicFacts(html: string, sourceUrl: string) {
  const $ = cheerio.load(html); $("script,style,noscript,nav,footer").remove();
  const title = $("title").text().trim(); const text = normalizedEvidence($("main").text()) || normalizedEvidence($("body").text()); const clipped = text.slice(0, 40_000);
  if (!env.OPENAI_API_KEY) return { extracted: { model: null, brand: null, title, facts: [], warnings: ["AI_NOT_CONFIGURED"] }, evidence: { sourceUrl, title, excerpt: clipped.slice(0, 1000) }, confidence: 0 };
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });
  const completion = await openai.chat.completions.create({ model: env.OPENAI_MODEL, temperature: 0, response_format: { type: "json_object" }, messages: [
    { role: "system", content: "Extract only explicitly stated product facts as JSON: model, brand, title, facts[{label,value,sourceQuote,translations:{zh:{label,value},en:{label,value},ru:{label,value}}}], warnings. sourceQuote must be an exact contiguous quote from the supplied text. Translate labels and prose values, but preserve every model, number and unit exactly. Never infer, convert units, add certifications, availability, prices or marketing claims. Use null when unknown." },
    { role: "user", content: `Source: ${sourceUrl}\nTitle: ${title}\nText: ${clipped}` },
  ] });
  const parsed = extractionSchema.parse(JSON.parse(completion.choices[0]?.message.content ?? "{}")); const warnings = [...parsed.warnings];
  const facts = parsed.facts.flatMap((fact) => {
    if (!clipped.includes(normalizedEvidence(fact.sourceQuote))) { warnings.push(`QUOTE_NOT_FOUND:${fact.label}`); return []; }
    if (fact.translations && Object.values(fact.translations).some((translation) => protectedTokens(translation.value).join("|") !== protectedTokens(fact.value).join("|"))) { warnings.push(`PROTECTED_TOKEN_CHANGED:${fact.label}`); return [{ ...fact, translations: undefined }]; }
    return [fact];
  });
  const explicitlyPresent = (value: string | null) => value && clipped.includes(normalizedEvidence(value)) ? value : null;
  const extracted = { ...parsed, model: explicitlyPresent(parsed.model), brand: explicitlyPresent(parsed.brand), facts, warnings };
  return { extracted, evidence: { sourceUrl, title, quotes: facts.map((fact) => fact.sourceQuote) }, confidence: facts.length ? warnings.length ? .6 : .85 : 0 };
}
