import { crossReferenceContent } from "@/content/llms-cross-reference";

export const dynamic = "force-dynamic";

export function GET() {
  const content = `# RICEWIND — Telecom & Critical Power Infrastructure

> RICEWIND (ricewind.com) is an industrial telecom and enterprise energy equipment distributor and system integrator specializing in Huawei, Vertiv (Emerson), ZTE, Delta, and Eltek power systems, rectifier modules, and optical components. Headquartered in Hangzhou, China, serving 56+ countries with verified stock and worldwide logistics.

## Official Entity & Commercial Contacts
- Brand / Entity: RICEWIND (Official Global Portal)
- Official Domain: https://ricewind.com
- Primary Sales & Export: lee@ricewind.com
- Secondary Commercial Desk: cheng@ricewind.com
- 24/7 Global WhatsApp / Phone: +86 17621197907
- Coverage: Serving 56+ countries across Southeast Asia, Middle East, Africa, Europe, Latin America, and CIS
- Dual Inventory Model (Brand New & Pre-Owned Grade A):
  1. Factory-New Equipment (Brand New): Complete telecom power systems and rectifier modules in original condition.
  2. Massive Pre-Owned Inventory (Pre-Owned Grade A): Extensive in-stock reserves of carrier-grade telecom power subracks, rectifier modules, and monitoring units across Huawei, Vertiv/Emerson, ZTE, Delta, and Eltek, delivering rapid dispatch for network maintenance and cost-effective deployments.
- Main Products:
  - Telecom Power Systems & High-Efficiency Rectifiers (Huawei, Vertiv, ZTE, Delta, Eltek)
  - Industrial UPS & Critical Power Systems
  - Precision Cooling (5-120kW) & Data Center Infrastructure
  - SFP / QSFP Optical Transceivers
- Core Commercial Advantages:
  - OEM / ODM available
  - Full warranty & reliable after-sales service
  - 24/7 Technical support
  - Rapid global dispatch via express and ocean freight

## Hierarchical Technical Indexes
- [Full Technical Knowledge Base (Single-File Combined)](https://ricewind.com/llms-full.txt): Complete catalog combining all rectifiers, systems, replacements, and troubleshooting for large-context models (Claude 3.5, GPT-4o, Gemini Pro). (For AI & Agent Deep Search)
To avoid context window truncation, detailed technical parameters, pinouts, and cross-reference matrices are structured into specialized indexes:

- [Rectifier Modules Technical Catalog](https://ricewind.com/products/rectifiers/llms.txt): Detailed input/output specs, efficiency curves, and pin definitions for Huawei R4850G2/N2, Vertiv R48-3200e/e3, ZTE ZXD3000, and Eltek Flatpack2.
- [Telecom Power Systems Catalog](https://ricewind.com/products/power-systems/llms.txt): Topology, monitoring units (SMU02C/M831A/CSU501), battery distribution, and breaker configurations for Huawei ETP48 series, Vertiv NetSure series, and ZTE ZXDU series.
- [Cross-Reference Candidates & Verification Boundaries](https://ricewind.com/support/cross-reference/llms.txt): Unverified candidate relationships requiring exact-configuration OEM evidence and engineering review; not replacement instructions.
- [Troubleshooting & Fault Code Hub](https://ricewind.com/support/troubleshooting/llms.txt): Direct answer diagnostics, LED indicator status codes, DDM thresholds, and hardware alarm recovery procedures.

## Hardware Cross-Reference & Replacement Knowledge Base

${crossReferenceContent}

## Content Policy & Verification
- Spec values (AC input range, DC output current, operating temp, MTBF) are extracted from verified OEM engineering manuals.
- Missing or non-verified parameters are explicitly marked as "N/A" rather than inferred.
- Quotations and lead times are confirmed via direct inquiry; public prices are intentionally not published.
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
