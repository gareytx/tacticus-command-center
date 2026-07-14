import { PRIORITIES, RANKS, RARITIES } from "./constants";

export const rankValue = (rank: string | null | undefined) =>
  rank ? RANKS.indexOf(rank as (typeof RANKS)[number]) : -1;
export const rarityValue = (rarity: string | null | undefined) =>
  rarity ? RARITIES.indexOf(rarity as (typeof RARITIES)[number]) : -1;
export const priorityValue = (priority: string) =>
  PRIORITIES.indexOf(priority as (typeof PRIORITIES)[number]);
