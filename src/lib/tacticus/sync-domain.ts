import { z } from "zod";
import { campaignSyncSchema } from "@/lib/campaigns/domain";
import { eventSyncSchema } from "@/lib/events/domain";

export const characterSyncSchema = z
  .object({
    externalId: z.string().min(1),
    definitionId: z.string().min(1),
    name: z.string().min(1).nullable(),
    faction: z.string().min(1).nullable(),
    alliance: z.enum(["IMPERIAL", "CHAOS", "XENOS", "UNKNOWN"]),
    characterLevel: z.number().int().min(1).max(50),
    rank: z.string().min(1),
    activeAbilityLevel: z.number().int().min(0).max(50).nullable(),
    passiveAbilityLevel: z.number().int().min(0).max(50).nullable(),
    shardsOwned: z.number().int().min(0),
    mythicShardsOwned: z.number().int().min(0),
    progressionIndex: z.number().int().min(0).max(15),
  })
  .passthrough();

export const inventorySyncSchema = z
  .object({
    externalId: z.string().min(1),
    displayName: z.string().nullable(),
    category: z.string().min(1),
    rarity: z.string().nullable(),
    quantity: z.number().int().min(0),
    metadata: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export const changeRecordSchema = z
  .object({
    field: z.string().min(1),
    previousValue: z.string().nullable(),
    newValue: z.string().nullable(),
  })
  .passthrough();

export const previewPayloadSchema = z
  .object({
    playerIdentity: z.string().min(1),
    upstreamLastUpdatedAt: z.string().datetime(),
    responseSchemaVersion: z.string().min(1),
    characters: z.array(characterSyncSchema),
    inventory: z.array(inventorySyncSchema),
    campaigns: z.array(campaignSyncSchema).default([]),
    events: z.array(eventSyncSchema).default([]),
  })
  .passthrough();

export const applyRequestSchema = z
  .object({
    previewToken: z.string().min(32).max(256),
    confirmed: z.literal(true),
  })
  .strict();

export type CharacterSync = z.infer<typeof characterSyncSchema>;
export type InventorySync = z.infer<typeof inventorySyncSchema>;
export type PreviewPayload = z.infer<typeof previewPayloadSchema>;

const RANKS = [
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

function alliance(value?: string | null): CharacterSync["alliance"] {
  const normalized = value?.toUpperCase();
  return normalized === "IMPERIAL" ||
    normalized === "CHAOS" ||
    normalized === "XENOS"
    ? normalized
    : "UNKNOWN";
}

function rarity(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"].includes(
    normalized,
  )
    ? normalized
    : "UNKNOWN";
}

function stablePart(value: unknown) {
  return String(value ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

export function normalizeCharacters(units: unknown[]): CharacterSync[] {
  return units.map((raw) => {
    const unit = raw as Record<string, unknown>;
    const abilities = Array.isArray(unit.abilities)
      ? (unit.abilities as Array<Record<string, unknown>>)
      : [];
    return characterSyncSchema.parse({
      externalId: unit.id,
      definitionId: unit.id,
      name: unit.name,
      faction: unit.faction,
      alliance: alliance(unit.grandAlliance as string | null),
      characterLevel: unit.xpLevel,
      rank: RANKS[Number(unit.rank)] ?? "UNKNOWN",
      activeAbilityLevel:
        typeof abilities[0]?.level === "number" ? abilities[0].level : null,
      passiveAbilityLevel:
        typeof abilities[1]?.level === "number" ? abilities[1].level : null,
      shardsOwned: unit.shards,
      mythicShardsOwned: unit.mythicShards,
      progressionIndex: unit.progressionIndex,
    });
  });
}

export function normalizeInventory(
  value: Record<string, unknown>,
): InventorySync[] {
  const result: InventorySync[] = [];
  const handled = new Set([
    "items",
    "upgrades",
    "shards",
    "mythicShards",
    "xpBooks",
    "abilityBadges",
    "components",
    "forgeBadges",
    "orbs",
    "requisitionOrders",
    "resetStones",
  ]);
  const add = (
    category: string,
    entry: Record<string, unknown>,
    discriminator = "",
  ) => {
    const base = entry.id ?? entry.name ?? entry.rarity ?? discriminator;
    const qualifier =
      typeof entry.level === "number" ? `:level-${entry.level}` : "";
    result.push(
      inventorySyncSchema.parse({
        externalId: `${category}:${stablePart(discriminator)}:${stablePart(base)}${qualifier}`,
        displayName: typeof entry.name === "string" ? entry.name : null,
        category,
        rarity: rarity(entry.rarity),
        quantity: entry.amount,
        metadata: Object.fromEntries(
          Object.entries(entry).filter(([key]) => key !== "amount"),
        ),
      }),
    );
  };
  for (const category of [
    "items",
    "upgrades",
    "shards",
    "mythicShards",
    "xpBooks",
    "components",
    "forgeBadges",
  ])
    for (const entry of (value[category] as
      Array<Record<string, unknown>> | undefined) ?? [])
      add(category, entry);
  for (const category of ["abilityBadges", "orbs"])
    for (const [group, entries] of Object.entries(
      (value[category] as Record<string, Array<Record<string, unknown>>>) ?? {},
    ))
      for (const entry of entries) add(category, entry, group);
  const requisitions = value.requisitionOrders as
    Record<string, unknown> | null | undefined;
  if (requisitions)
    for (const [kind, amount] of Object.entries(requisitions))
      add(
        "requisitionOrders",
        { name: `${kind} requisition orders`, amount },
        kind,
      );
  add(
    "resetStones",
    { name: "Reset stones", amount: value.resetStones },
    "resetStones",
  );

  // Preserve additive Snowprint inventory containers without turning their
  // category or rarity values into brittle local enums.
  for (const [category, container] of Object.entries(value)) {
    if (handled.has(category)) continue;
    if (Array.isArray(container)) {
      for (const entry of container)
        if (
          entry &&
          typeof entry === "object" &&
          typeof (entry as Record<string, unknown>).amount === "number"
        )
          add(category, entry as Record<string, unknown>);
      continue;
    }
    if (typeof container === "number") {
      add(category, { name: category, amount: container }, category);
      continue;
    }
    if (!container || typeof container !== "object") continue;
    for (const [group, groupValue] of Object.entries(container)) {
      if (Array.isArray(groupValue)) {
        for (const entry of groupValue)
          if (
            entry &&
            typeof entry === "object" &&
            typeof (entry as Record<string, unknown>).amount === "number"
          )
            add(category, entry as Record<string, unknown>, group);
      } else if (typeof groupValue === "number") {
        add(
          category,
          { name: `${group} ${category}`, amount: groupValue },
          group,
        );
      }
    }
  }
  return result;
}

export function slugFor(name: string, externalId: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "tacticus-unit"}-${stablePart(externalId)}`;
}
