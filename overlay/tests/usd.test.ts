import { describe, expect, it } from "vitest";
import { finalUsdCents, formatUsd, usdOffer } from "@/lib/usd";

describe("usd", () => {
  it("formats cents", () => {
    expect(formatUsd(139999)).toBe("$1,399.99");
    expect(formatUsd(129900)).toBe("$1,299");
    expect(formatUsd(23950)).toBe("$239.50");
    expect(formatUsd(12990)).toBe("$129.90");
    expect(formatUsd(14900)).toBe("$149");
    expect(formatUsd(null)).toBe("-");
    expect(formatUsd(Number.POSITIVE_INFINITY)).toBe("-");
  });
  it("applies discount like the DB column", () => {
    expect(finalUsdCents(100000, 10)).toBe(90000);
    expect(finalUsdCents(99999, 15)).toBe(84999);
    expect(finalUsdCents(5000, 0)).toBe(5000);
    expect(finalUsdCents(5000, 150)).toBe(0);
  });
  it("never returns NaN or a negative price", () => {
    expect(finalUsdCents(Number.NaN, 10)).toBe(0);
    expect(finalUsdCents(1000, Number.NaN)).toBe(1000);
    expect(finalUsdCents(-500, 10)).toBe(0);
    expect(finalUsdCents(1000, -20)).toBe(1000);
  });
  it("builds offer in dollars", () => {
    expect(usdOffer(139999, true).price).toBe("1399.99");
    expect(usdOffer(139999, false).availability).toContain("OutOfStock");
  });
});
