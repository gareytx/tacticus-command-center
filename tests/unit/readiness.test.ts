import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyUnit } from "@/lib/readiness/unit-classification";
import { classifyInventory } from "@/lib/readiness/inventory-taxonomy";
import {
  evaluateReadiness,
  priorityScore,
} from "@/lib/readiness/readiness-engine";
import { analyzeBottlenecks } from "@/lib/readiness/bottleneck-analysis";
import { normalizeInventory } from "@/lib/tacticus/sync-domain";

const fixture = JSON.parse(
  readFileSync("test/fixtures/tacticus/player-state.sanitized.json", "utf8"),
);
const base = {
  id: "c1",
  slug: "bellator",
  name: "Bellator",
  alliance: "IMPERIAL",
  priority: "HIGH",
  investmentStatus: "INVEST_NOW",
  unitType: "CHARACTER",
  shardsOwned: 7,
  shardsRequired: null,
  characterLevel: 25,
  rank: "BRONZE_II",
  activeGoal: false,
};

describe("Phase 2C semantics", () => {
  it("classifies the full sanitized fixture without structural guessing", () => {
    const values = fixture.player.units.map(
      (unit: { id: string }) => classifyUnit(unit.id).unitType,
    );
    expect(values.filter((v: string) => v === "CHARACTER")).toHaveLength(52);
    expect(values.filter((v: string) => v === "MACHINE_OF_WAR")).toHaveLength(
      5,
    );
    expect(values.filter((v: string) => v === "UNKNOWN")).toHaveLength(2);
    expect(classifyUnit("futureUnknownUnit").source).toBe("UNKNOWN");
  });

  it("maps every fixture inventory record and preserves unknown fallbacks", () => {
    const inventory = normalizeInventory(fixture.player.inventory);
    const mapped = inventory.map(classifyInventory);
    expect(inventory).toHaveLength(324);
    expect(new Set(inventory.map((item) => item.externalId)).size).toBe(324);
    expect(mapped).toHaveLength(inventory.length);
    expect(mapped.every((item) => item.resourceType !== "UNKNOWN")).toBe(true);
    const unknown = classifyInventory({
      externalId: "future:x:y",
      displayName: null,
      category: "future",
      rarity: null,
      metadata: {},
    });
    expect(unknown.displayName).toContain("Unknown resource");
    expect(unknown.semanticStatus).toBe("UNKNOWN");
  });

  it("passes every normalized logical resource into readiness analysis", () => {
    const inventory = normalizeInventory(fixture.player.inventory).map(
      (item) => {
        const taxonomy = classifyInventory(item);
        return {
          resourceType: taxonomy.resourceType,
          semanticStatus: taxonomy.semanticStatus,
          quantity: item.quantity,
        };
      },
    );
    const analysis = analyzeBottlenecks(inventory);
    expect(analysis.reduce((total, group) => total + group.records, 0)).toBe(
      324,
    );
    expect(inventory.filter((item) => item.quantity === 0)).toHaveLength(12);
  });

  it("makes an exact shard claim only with a verified local threshold", () => {
    const unknown = evaluateReadiness(base)[0];
    expect(unknown).toMatchObject({
      status: "UNKNOWN",
      confidence: "INSUFFICIENT_DATA",
    });
    const blocked = evaluateReadiness({ ...base, shardsRequired: 10 })[0];
    expect(blocked).toMatchObject({
      status: "BLOCKED",
      confidence: "EXACT",
      missing: 3,
    });
    const ready = evaluateReadiness({
      ...base,
      shardsOwned: 10,
      shardsRequired: 10,
    })[0];
    expect(ready).toMatchObject({ status: "READY", missing: 0 });
  });

  it("uses strategy priority rather than presenting a tier rating", () => {
    expect(priorityScore(base, "READY", 0)).toBeGreaterThan(
      priorityScore({ ...base, priority: "LOW" }, "READY", 0),
    );
  });

  it("labels stock analysis as incomplete without recipe demand", () => {
    const result = analyzeBottlenecks([
      { resourceType: "ORB", quantity: 0, semanticStatus: "PARTIAL" },
    ]);
    expect(result[0]).toMatchObject({
      zero: 1,
      confidence: "INSUFFICIENT_DATA",
    });
    expect(result[0].explanation).toContain(
      "not asserted as a true bottleneck",
    );
  });
});
