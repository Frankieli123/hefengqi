import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  const content = `# RICEWIND — Telecom Power System Troubleshooting & Fault Code Hub

> Field engineering diagnostic guides, LED indicator status codes, alarm codes, and recovery procedures for telecom DC power supplies.

## 1. Rectifier LED Physical Status & Diagnostics
- **Green LED Solid**: AC input and DC output are operating normally within specified ranges.
- **Yellow LED Flashing**: Warning state — communication failure between rectifier and controller (check CAN bus baud rate, default 125 kbps) or ambient over-temperature derating.
- **Yellow LED Solid**: Protection state — AC input under-voltage (<85VAC) or over-voltage (>300VAC). Recovers automatically when utility grid normalizes.
- **Red LED Solid**: Fault shutdown — internal hardware fault, DC output over-voltage (>59.5V DC latch), or fan stall failure. Disconnect AC power for 180 seconds to clear latch.

## 2. Common Controller Alarm Codes & Field Recovery
- **Alarm 01 / Rectifier Comm Loss**: Check CAN bus termination resistor (120 Ohm) and slot addressing. Reseat rectifier module.
- **Alarm 02 / Mains Phase Missing**: Measure AC input terminals with True-RMS multimeter; inspect input circuit breakers and AC surge protection device (SPD).
- **Alarm 03 / Battery Low Voltage Disconnect (LVD)**:
  - LLVD trip: 44.0V DC (sheds non-critical loads).
  - BLVD trip: 43.2V DC (disconnects battery bank to prevent deep discharge).
  - Recovery: Once utility AC is restored, the monitoring controller automatically closes battery contactors and initiates boost/equalize charging.

## 3. High-Temperature Derating & Thermal Management
- Operating temp envelope: -40°C ~ +75°C.
- Output power operates at 100% full rating between -40°C and +45°C / +55°C.
- Above +55°C, internal DSP throttles output power linearly down to 0W at +75°C to protect power semiconductors.
- Maintenance action: Clean intake dust filters and inspect front-to-back fan rotation.

## Engineering Support & Rapid Dispatch
- Need emergency replacement parts or technical consultation?
- 24/7 WhatsApp: +86 17621197907 | Email: lee@ricewind.com
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
