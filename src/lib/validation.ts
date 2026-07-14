import { z } from "zod";
import {
  ALLIANCES,
  GOAL_STATUSES,
  INVESTMENT_STATUSES,
  PRIORITIES,
  RANKS,
  RARITIES,
  TEAM_MODES,
} from "./constants";

const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(min).max(max).optional(),
  );
export const characterSchema = z.object({
  name: z.string().trim().min(1, "Enter a character name.").max(80),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only."),
  faction: z.string().trim().min(1, "Enter a faction.").max(80),
  alliance: z.enum(ALLIANCES),
  rarity: z.enum(RARITIES).optional(),
  rank: z.enum(RANKS).optional(),
  starLevel: optionalNumber(0, 11),
  redStarLevel: optionalNumber(0, 5),
  characterLevel: optionalNumber(1, 60),
  rankProgress: optionalNumber(0, 100),
  activeAbilityLevel: optionalNumber(1, 60),
  passiveAbilityLevel: optionalNumber(1, 60),
  shardsOwned: optionalNumber(0, 99999),
  shardsRequired: optionalNumber(0, 99999),
  priority: z.enum(PRIORITIES),
  investmentStatus: z.enum(INVESTMENT_STATUSES),
  notes: z.string().trim().max(4000).optional(),
  portraitUrl: z
    .union([z.literal(""), z.url("Enter a valid image URL.")])
    .optional(),
  isOwned: z.preprocess(
    (v) => v === true || v === "true" || v === "on",
    z.boolean(),
  ),
});
export const goalSchema = z.object({
  characterId: z.string().min(1),
  targetRank: z.enum(RANKS).optional(),
  targetRarity: z.enum(RARITIES).optional(),
  targetCharacterLevel: optionalNumber(1, 60),
  targetActiveAbilityLevel: optionalNumber(1, 60),
  targetPassiveAbilityLevel: optionalNumber(1, 60),
  priority: z.enum(PRIORITIES),
  reason: z.string().max(1000).optional(),
  status: z.enum(GOAL_STATUSES),
});
export const teamSchema = z.object({
  name: z.string().trim().min(1, "Enter a team name.").max(80),
  mode: z.enum(TEAM_MODES),
  notes: z.string().max(2000).optional(),
});
export const teamMemberSchema = z.object({
  teamId: z.string().min(1),
  characterId: z.string().min(1),
  position: z.coerce.number().int().min(1).max(10),
  role: z.string().max(80).optional(),
  notes: z.string().max(500).optional(),
});
export function hasDuplicateTeamMember(
  members: { characterId: string; position: number }[],
  candidate: { characterId: string; position: number },
) {
  return members.some(
    (member) =>
      member.characterId === candidate.characterId ||
      member.position === candidate.position,
  );
}

export function formDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
