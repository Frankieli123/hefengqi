import { describe, expect, it } from "vitest";
import { formatAttributeValue } from "@/lib/attribute-format";

describe("formatAttributeValue", () => {
  it("does not repeat English or localized units already present in the value", () => {
    expect(formatAttributeValue("300A (-48V DC)", "A")).toBe("300A (-48V DC)");
    expect(formatAttributeValue("6 Slots", "Slots")).toBe("6 Slots");
    expect(formatAttributeValue("800W", "W")).toBe("800W");
    expect(formatAttributeValue("25kW ~ 45kW In-Row Cooling", "kW")).toBe("25kW ~ 45kW In-Row Cooling");
    expect(formatAttributeValue("3000 Вт Номинальная выходная мощность", "W")).toBe("3000 Вт Номинальная выходная мощность");
    expect(formatAttributeValue("25 кВт Рядное охлаждение", "kW")).toBe("25 кВт Рядное охлаждение");
    expect(formatAttributeValue("85В AC ~ 295В AC", "VAC")).toBe("85В AC ~ 295В AC");
    expect(formatAttributeValue("-48В DC", "VDC")).toBe("-48В DC");
    expect(formatAttributeValue("-15°C ~ +45°C", "°C")).toBe("-15°C ~ +45°C");
    expect(formatAttributeValue("-40°C ~ +55°C", "°C")).toBe("-40°C ~ +55°C");
    expect(formatAttributeValue("≥ 96%", "%")).toBe("≥ 96%");
    expect(formatAttributeValue("96.5%", "%")).toBe("96.5%");
    expect(formatAttributeValue("10% ~ 90% RH", "%RH")).toBe("10% ~ 90% RH");
    expect(formatAttributeValue("<55dB", "dB(A)")).toBe("<55dB");
    expect(formatAttributeValue("500,000 Hours", "Hours")).toBe("500,000 Hours");
  });

  it("appends a genuinely absent unit", () => {
    expect(formatAttributeValue("3000", "W")).toBe("3000 W");
    expect(formatAttributeValue("25", "°C")).toBe("25 °C");
    expect(formatAttributeValue("96", "%")).toBe("96 %");
  });
});
