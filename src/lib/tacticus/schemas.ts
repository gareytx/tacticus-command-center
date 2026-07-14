import { z } from "zod";
import type {
  NormalizedAlliance,
  NormalizedRarity,
  TacticusPlayerState,
  TacticusStateSummary,
} from "./types";
import { TacticusError } from "./errors";

const nullableOptionalString = z.string().nullable().optional();
const amount = z.number().int();
const namedAmount = z
  .object({ id: z.string().min(1), name: nullableOptionalString, amount })
  .passthrough();
const rarityAmount = z
  .object({ name: nullableOptionalString, rarity: z.string().min(1), amount })
  .passthrough();
const unitItem = z
  .object({
    slotId: z.string().min(1),
    level: z.number().int().min(1).max(11),
    id: z.string().min(1),
    name: nullableOptionalString,
    rarity: nullableOptionalString,
  })
  .passthrough();
const ability = z
  .object({ id: z.string().min(1), level: z.number().int().min(0).max(50) })
  .passthrough();
const unit = z
  .object({
    id: z.string().min(1),
    name: nullableOptionalString,
    faction: nullableOptionalString,
    grandAlliance: nullableOptionalString,
    progressionIndex: z.number().int().min(0).max(15),
    xp: z.number().int().min(0),
    xpLevel: z.number().int().min(1).max(50),
    rank: z.number().int().min(0).max(17),
    abilities: z.array(ability),
    upgrades: z.array(z.number().int()),
    items: z.array(unitItem),
    shards: z.number().int().min(0),
    mythicShards: z.number().int().min(0),
  })
  .passthrough();
const inventory = z
  .object({
    items: z.array(
      z
        .object({
          id: z.string().min(1),
          name: nullableOptionalString,
          level: z.number().int(),
          amount,
        })
        .passthrough(),
    ),
    upgrades: z.array(namedAmount),
    shards: z.array(namedAmount),
    mythicShards: z.array(namedAmount),
    xpBooks: z.array(
      z
        .object({ id: z.string().min(1), rarity: z.string().min(1), amount })
        .passthrough(),
    ),
    abilityBadges: z.record(z.string(), z.array(rarityAmount)),
    components: z.array(
      z
        .object({
          name: z.string().min(1),
          grandAlliance: z.string().min(1),
          amount,
        })
        .passthrough(),
    ),
    forgeBadges: z.array(rarityAmount.extend({ name: z.string().min(1) })),
    orbs: z.record(z.string(), z.array(rarityAmount.omit({ name: true }))),
    requisitionOrders: z
      .object({ regular: z.number().int(), blessed: z.number().int() })
      .passthrough()
      .nullable()
      .optional(),
    resetStones: z.number().int(),
  })
  .passthrough();
const progress = z
  .object({
    campaigns: z.array(z.unknown()),
    legendaryEvents: z.array(z.unknown()),
  })
  .passthrough();

export const tacticusPlayerStateSchema = z
  .object({
    player: z
      .object({
        details: z
          .object({
            name: z.string().trim().min(1),
            powerLevel: z.number().int(),
          })
          .passthrough(),
        units: z.array(unit),
        inventory,
        progress,
      })
      .passthrough(),
    metaData: z
      .object({
        configHash: z.string().min(1),
        apiKeyExpiresOn: z.number().int().nonnegative().nullable().optional(),
        lastUpdatedOn: z.number().int().nonnegative(),
        scopes: z.array(z.string().min(1)),
      })
      .passthrough(),
  })
  .passthrough();

export function parsePlayerState(raw: unknown): TacticusPlayerState {
  const parsed = tacticusPlayerStateSchema.safeParse(raw);
  if (!parsed.success) throw new TacticusError("MALFORMED_RESPONSE");
  return parsed.data as TacticusPlayerState;
}

export function unixSecondsToDate(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 8_640_000_000)
    throw new TacticusError("MALFORMED_RESPONSE");
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime()))
    throw new TacticusError("MALFORMED_RESPONSE");
  return date;
}

export function normalizeAlliance(value?: string | null): NormalizedAlliance {
  const normalized = value?.toUpperCase();
  return normalized === "IMPERIAL" ||
    normalized === "XENOS" ||
    normalized === "CHAOS"
    ? normalized
    : "UNKNOWN";
}

export function normalizeRarity(value?: string | null): NormalizedRarity {
  const normalized = value?.toUpperCase();
  return ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"].includes(
    normalized ?? "",
  )
    ? (normalized as NormalizedRarity)
    : "UNKNOWN";
}

export function countInventoryRecords(value: Record<string, unknown>) {
  const arrays = [
    "items",
    "upgrades",
    "shards",
    "mythicShards",
    "xpBooks",
    "components",
    "forgeBadges",
  ];
  let count = arrays.reduce(
    (total, key) => total + (Array.isArray(value[key]) ? value[key].length : 0),
    0,
  );
  for (const key of ["abilityBadges", "orbs"]) {
    const groups = value[key];
    if (groups && typeof groups === "object")
      count += Object.values(groups).reduce<number>(
        (total, group) => total + (Array.isArray(group) ? group.length : 0),
        0,
      );
  }
  if (value.requisitionOrders) count += 2;
  if (typeof value.resetStones === "number") count += 1;
  return count;
}

export function summarizePlayerState(
  state: TacticusPlayerState,
  now = new Date(),
): TacticusStateSummary {
  if (!state.metaData.scopes.some((scope) => scope.toLowerCase() === "player"))
    throw new TacticusError("MISSING_PLAYER_SCOPE");
  const upstreamLastUpdatedAt = unixSecondsToDate(state.metaData.lastUpdatedOn);
  const inventoryRecordCount = countInventoryRecords(state.player.inventory);
  return {
    playerName: state.player.details.name,
    externalPlayerId: null,
    powerLevel: state.player.details.powerLevel,
    scopes: state.metaData.scopes,
    upstreamLastUpdatedAt,
    responseSchemaVersion: state.metaData.configHash,
    unitCount: state.player.units.length,
    inventoryRecordCount,
    recordsReceived: state.player.units.length + inventoryRecordCount,
    stale:
      now.getTime() - upstreamLastUpdatedAt.getTime() > 24 * 60 * 60 * 1000,
  };
}
