import { describe, expect, it } from "vitest";
import { priorityValue, rankValue } from "@/lib/order";
describe("ordering", () => {
  it("orders all rank stages from Stone I through Diamond III", () => {
    expect(rankValue("STONE_I")).toBeLessThan(rankValue("STONE_III"));
    expect(rankValue("GOLD_III")).toBeLessThan(rankValue("DIAMOND_I"));
    expect(rankValue("DIAMOND_III")).toBe(17);
  });
  it("places critical priority before hold", () => {
    expect(priorityValue("CRITICAL")).toBeLessThan(priorityValue("HIGH"));
    expect(priorityValue("LOW")).toBeLessThan(priorityValue("HOLD"));
  });
});
