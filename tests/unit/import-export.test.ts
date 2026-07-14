import { describe, expect, it } from "vitest";
import { buildExport, exportSchema, previewImport } from "@/lib/import-export";
const character = {
  id: "c1",
  name: "Bellator",
  slug: "bellator",
  faction: "Ultramarines",
  alliance: "IMPERIAL" as const,
  priority: "MEDIUM" as const,
  investmentStatus: "MAINTAIN" as const,
  isOwned: true,
};
describe("JSON exchange", () => {
  it("builds the versioned export shape", () => {
    const result = buildExport({
      characters: [character],
      teams: [],
      teamMembers: [],
      upgradeGoals: [],
    });
    expect(result.schemaVersion).toBe(1);
    expect(result.exportedAt).toMatch(/^\d{4}-/);
    expect(exportSchema.safeParse(result).success).toBe(true);
  });
  it("rejects an unsupported schema version", () =>
    expect(
      previewImport(
        {
          schemaVersion: 2,
          exportedAt: new Date().toISOString(),
          characters: [],
          teams: [],
          teamMembers: [],
          upgradeGoals: [],
        },
        [],
      ).valid,
    ).toBe(false));
  it("previews creates and updates", () => {
    const data = buildExport({
      characters: [character],
      teams: [],
      teamMembers: [],
      upgradeGoals: [],
    });
    const result = previewImport(data, ["bellator"]);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.characters[0].action).toBe("update");
  });
});
