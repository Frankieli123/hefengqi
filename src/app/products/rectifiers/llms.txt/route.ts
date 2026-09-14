import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const siteUrl = env.SITE_URL;

export function GET() {
  const content = `# RICEWIND — High-Efficiency Telecom Rectifier Modules

> Verified technical specifications, electrical ratings, pinout interfaces, and direct replacements for carrier-grade 48V DC rectifier modules.

## 1. Huawei R4850 Series (50A / 3000W)
- **Model**: R4850G2 (High Efficiency) / R4850N2 (Standard)
- **Rated Output**: 53.5V DC (Adjustable 42V ~ 58V DC), 56.1A Max (3000W @ 176~290V AC)
- **AC Input**: 85V ~ 300V AC (Derated below 176V AC: 50% capacity @ 85~176V AC)
- **Efficiency**: R4850G2 >= 96.0% peak; R4850N2 >= 94.0%
- **Cooling**: Built-in speed-controlled DC brushless fan (front-to-back airflow)
- **Interface**: Hot-pluggable gold-finger blind-mate connector with CAN bus telemetry
- **Dimensions & Weight**: 40.8 mm (H) x 105 mm (W) x 281 mm (D) | ~1.6 kg
- **Alarm / LED Status**:
  - Green (Normal): AC input & DC output within limits
  - Yellow Flashing: CAN communication interrupted / High ambient temp protection
  - Red Solid: Output overvoltage shutdown / Internal fan stall failure

## 2. Vertiv / Emerson R48 Series (50A / 3200W)
- **Model**: R48-3200e (e-Series High Efficiency) / R48-3200 / R48-2000e3
- **Rated Output**: 48V DC nominal (Adjustable 42V ~ 58V DC), 66.7A Max (3200W)
- **AC Input**: 85V ~ 300V AC (Nominal 200~250V AC full output)
- **Efficiency**: >= 96.2% peak
- **Form Factor**: Hot-swappable 1U blade for NetSure 501 / 701 / 731 subracks
- **Monitoring Compatibility**: NCU / M831A / M830B via proprietary serial/CAN bus
- **Protection**: Input surge (6kV), output short-circuit hiccup, thermal shutdown

## 3. ZTE ZXD Series (50A / 3000W)
- **Model**: ZXD3000 (V5.0 / V5.1 / V5.5) / ZXD2400 (50A 2400W)
- **Rated Output**: 48V DC nominal (42V ~ 58V DC), 50A continuous
- **AC Input**: 80V ~ 300V AC single-phase
- **Efficiency**: >= 95.5% (V5.0 series)
- **Dimensions**: 134 mm (H) x 87 mm (W) x 290 mm (D) | ~3.8 kg
- **System Compatibility**: ZXDU68 S301, ZXDU68 B301, ZXDU58 W121

## 4. Eltek Flatpack2 HE Series (48V / 2000W ~ 3000W)
- **Model**: Flatpack2 48/3000 HE (High Efficiency) / Flatpack2 48/2000 HE
- **Part Numbers**: 241119.105 (3000 HE), 241115.105 (2000 HE)
- **Rated Output**: 48V DC nominal (Adjustable 43.5V ~ 57.6V DC), 62.5A Max (3000W @ 185~275V AC)
- **AC Input**: 85V ~ 300V AC (Nominal 185~275V AC full output; derated down to 85V AC)
- **Peak Efficiency**: >= 96.5% (Super High Efficiency SHE models reach 97.8%)
- **Dimensions**: 109 mm (W) x 41.5 mm (H) x 327 mm (D) | ~1.9 kg
- **System Compatibility**: Eltek Compact, Flatpack2 1U/2U integrated shelves, Smartpack2 Master controller

## Inquiries & Commercial Contacts (采购与分销直达)
- Testing Standard: Every unit passes 100% full-load burn-in on Chroma programmable loads.
- Global Sourcing: In-stock in Hangzhou and Shenzhen bonded warehouses.
- Primary Sales: lee@ricewind.com
- Commercial Desk: cheng@ricewind.com
- 24/7 Global WhatsApp / Phone: +86 17621197907
- Worldwide Delivery: Express air and ocean shipping to 50+ countries (SEA, MEA, Europe, CIS, LATAM).
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
