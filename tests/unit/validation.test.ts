import { describe, expect, it } from "vitest";
import { characterSchema, hasDuplicateTeamMember } from "@/lib/validation";
const valid = {
  name: "Bellator",
  slug: "bellator",
  faction: "Ultramarines",
  alliance: "IMPERIAL",
  priority: "MEDIUM",
  investmentStatus: "MAINTAIN",
  isOwned: true,
};
describe("character validation", () => {
  it("accepts conservative unknown progression fields", () =>
    expect(characterSchema.safeParse(valid).success).toBe(true));
  it("returns friendly errors", () => {
    const result = characterSchema.safeParse({
      ...valid,
      name: "",
      slug: "Not Valid",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((i) => i.message)).toContain(
        "Enter a character name.",
      );
  });
});
describe("team member prevention", () => {
  const members = [{ characterId: "a", position: 1 }];
  it("rejects a duplicate character", () =>
    expect(
      hasDuplicateTeamMember(members, { characterId: "a", position: 2 }),
    ).toBe(true));
  it("rejects a duplicate position", () =>
    expect(
      hasDuplicateTeamMember(members, { characterId: "b", position: 1 }),
    ).toBe(true));
  it("accepts a unique assignment", () =>
    expect(
      hasDuplicateTeamMember(members, { characterId: "b", position: 2 }),
    ).toBe(false));
});
