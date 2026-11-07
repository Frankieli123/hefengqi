import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonLd } from "@/components/json-ld";
import { localizedMetadata, organizationSchema, productSchema } from "@/lib/seo";
import { getDemoProducts } from "@/content/demo-data";
import robots from "@/app/robots";

vi.mock("@/lib/env", () => ({ env: { SITE_URL: "https://ricewind.com" }, isDemoMode: true }));

describe("WP01 truthful crawler output", () => {
  it("does not promise an offer or invent product modification dates", () => {
    const schema = productSchema("en", { ...getDemoProducts("en")[0], updatedAt: "" });
    expect(schema).not.toHaveProperty("offers");
    expect(schema.dateModified).toBeUndefined();
    expect(JSON.stringify(schema)).not.toMatch(/InStock|priceCurrency|shippingDetails|itemCondition|hasMerchantReturnPolicy/);
  });
  it("uses one organization identity and retains the real logo URL", () => {
    const schema = organizationSchema("en");
    expect(schema).toHaveProperty("@id", "https://ricewind.com/#organization");
    expect(organizationSchema("zh")).toHaveProperty("@id", schema["@id" as keyof typeof schema]);
    expect(schema.alternateName).not.toContain("HEFENGQI");
    expect(schema.logo).toBe("https://ricewind.com/brand/hefengqi-mark.png");
  });
  it("applies the same restrictions to every accepted bot", () => {
    const rules = robots().rules as Array<{ disallow: string[] }>;
    for (const rule of rules) expect(rule.disallow).toEqual(rules[0].disallow);
  });
  it("does not advertise invented dynamic translations", () => {
    expect(localizedMetadata("fr", "/products/example", "", "").alternates?.languages).toEqual({});
  });
  it("serializes hostile CMS strings as data, including graph payloads", () => {
    const value = '</script><script>alert("x")</script>\u2028&';
    for (const data of [{ name: value }, [{ name: value }]]) {
      const html = renderToStaticMarkup(<JsonLd data={data} />);
      expect(html.match(/<script/g)).toHaveLength(1);
      const parsed = JSON.parse(html.slice(html.indexOf(">") + 1, html.lastIndexOf("</script>")));
      expect(parsed.name ?? parsed["@graph"][0].name).toBe(value);
    }
  });
});
