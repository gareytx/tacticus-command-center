export const ALLIANCES = ["IMPERIAL", "CHAOS", "XENOS"] as const;
export const RARITIES = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
  "MYTHIC",
] as const;
export const RANKS = [
  "STONE_I",
  "STONE_II",
  "STONE_III",
  "IRON_I",
  "IRON_II",
  "IRON_III",
  "BRONZE_I",
  "BRONZE_II",
  "BRONZE_III",
  "SILVER_I",
  "SILVER_II",
  "SILVER_III",
  "GOLD_I",
  "GOLD_II",
  "GOLD_III",
  "DIAMOND_I",
  "DIAMOND_II",
  "DIAMOND_III",
] as const;
export const PRIORITIES = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "HOLD",
] as const;
export const INVESTMENT_STATUSES = [
  "INVEST_NOW",
  "CAMPAIGN_PRIORITY",
  "GUILD_RAID_PRIORITY",
  "ARENA_PRIORITY",
  "EVENT_PRIORITY",
  "MAINTAIN",
  "IGNORE_FOR_NOW",
] as const;
export const TEAM_MODES = [
  "ARENA",
  "GUILD_RAID",
  "GUILD_WAR",
  "SALVAGE_RUN",
  "ONSLAUGHT",
  "CHARACTER_EVENT",
  "INDOMITUS",
  "INDOMITUS_MIRROR",
  "FALL_OF_CADIA",
  "FALL_OF_CADIA_MIRROR",
  "OCTARIUS",
  "OCTARIUS_MIRROR",
  "SAIM_HANN",
  "SAIM_HANN_MIRROR",
  "OTHER",
] as const;
export const GOAL_STATUSES = [
  "PLANNED",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
] as const;
export const UNIT_TYPES = ["CHARACTER", "MACHINE_OF_WAR", "UNKNOWN"] as const;

export function label(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
    .replace(/\bIi\b/g, "II")
    .replace(/\bIii\b/g, "III");
}
