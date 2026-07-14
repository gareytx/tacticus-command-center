import { z } from "zod";
import {
  characterSchema,
  goalSchema,
  teamMemberSchema,
  teamSchema,
} from "./validation";
import { RANKS, RARITIES } from "./constants";

const dated = {
  id: z.string(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
};
const characterExportSchema = characterSchema.extend({
  rarity: z.enum(RARITIES).nullable().optional(),
  rank: z.enum(RANKS).nullable().optional(),
  starLevel: z.number().int().nullable().optional(),
  redStarLevel: z.number().int().nullable().optional(),
  characterLevel: z.number().int().nullable().optional(),
  rankProgress: z.number().int().nullable().optional(),
  activeAbilityLevel: z.number().int().nullable().optional(),
  passiveAbilityLevel: z.number().int().nullable().optional(),
  shardsOwned: z.number().int().nullable().optional(),
  shardsRequired: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  portraitUrl: z.string().nullable().optional(),
});
const teamExportSchema = teamSchema.extend({
  notes: z.string().nullable().optional(),
});
const teamMemberExportSchema = teamMemberSchema.extend({
  id: z.string(),
  role: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
const goalExportSchema = goalSchema.extend({
  targetRank: z.enum(RANKS).nullable().optional(),
  targetRarity: z.enum(RARITIES).nullable().optional(),
  targetCharacterLevel: z.number().int().nullable().optional(),
  targetActiveAbilityLevel: z.number().int().nullable().optional(),
  targetPassiveAbilityLevel: z.number().int().nullable().optional(),
  reason: z.string().nullable().optional(),
});
export const exportSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  characters: z.array(characterExportSchema.extend(dated)),
  teams: z.array(teamExportSchema.extend(dated)),
  teamMembers: z.array(teamMemberExportSchema),
  upgradeGoals: z.array(goalExportSchema.extend(dated)),
});
export type RosterExport = z.infer<typeof exportSchema>;

export function buildExport(
  data: Omit<RosterExport, "schemaVersion" | "exportedAt">,
): RosterExport {
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), ...data };
}

type ExistingImportKeys = {
  teamIds?: string[];
  teamMemberKeys?: string[];
  goalIds?: string[];
};

export function previewImport(
  raw: unknown,
  existingSlugs: string[],
  existing: ExistingImportKeys = {},
) {
  const parsed = exportSchema.safeParse(raw);
  if (!parsed.success)
    return {
      valid: false as const,
      errors: parsed.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`,
      ),
    };
  const seen = new Set<string>();
  const characters = parsed.data.characters.map((character) => {
    if (seen.has(character.slug))
      return {
        name: character.name,
        slug: character.slug,
        action: "reject" as const,
        reason: "Duplicate slug in import",
      };
    seen.add(character.slug);
    return {
      name: character.name,
      slug: character.slug,
      action: existingSlugs.includes(character.slug)
        ? ("update" as const)
        : ("create" as const),
    };
  });
  const records: {
    category: string;
    name: string;
    action: "create" | "update" | "skip" | "reject";
    reason?: string;
  }[] = characters.map((item) => ({ category: "Character", ...item }));
  const seenTeams = new Set<string>();
  for (const team of parsed.data.teams) {
    const duplicate = seenTeams.has(team.id);
    seenTeams.add(team.id);
    records.push({
      category: "Team",
      name: team.name,
      action: duplicate
        ? "reject"
        : existing.teamIds?.includes(team.id)
          ? "update"
          : "create",
      ...(duplicate ? { reason: "Duplicate team ID in import" } : {}),
    });
  }
  const seenMembers = new Set<string>();
  for (const member of parsed.data.teamMembers) {
    const key = `${member.teamId}:${member.characterId}:${member.position}`;
    const duplicate = seenMembers.has(key);
    seenMembers.add(key);
    records.push({
      category: "Team member",
      name: `Position ${member.position}`,
      action: duplicate
        ? "reject"
        : existing.teamMemberKeys?.includes(key)
          ? "skip"
          : "create",
      ...(duplicate ? { reason: "Duplicate team assignment in import" } : {}),
    });
  }
  const seenGoals = new Set<string>();
  for (const goal of parsed.data.upgradeGoals) {
    const duplicate = seenGoals.has(goal.id);
    seenGoals.add(goal.id);
    records.push({
      category: "Upgrade goal",
      name: goal.reason || goal.id,
      action: duplicate
        ? "reject"
        : existing.goalIds?.includes(goal.id)
          ? "update"
          : "create",
      ...(duplicate ? { reason: "Duplicate goal ID in import" } : {}),
    });
  }
  return { valid: true as const, data: parsed.data, characters, records };
}
