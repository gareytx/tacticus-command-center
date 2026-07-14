export type InventoryTaxonomy = {
  resourceType:
    | "EQUIPMENT"
    | "UPGRADE_MATERIAL"
    | "SHARD"
    | "MYTHIC_SHARD"
    | "XP_BOOK"
    | "ABILITY_BADGE"
    | "COMPONENT"
    | "FORGE_BADGE"
    | "ORB"
    | "REQUISITION_ORDER"
    | "RESET_STONE"
    | "UNKNOWN";
  resourceSubtype: string | null;
  allianceRestriction: string | null;
  semanticStatus: "VERIFIED" | "PARTIAL" | "UNKNOWN";
  externalResourceId: string;
  displayName: string;
};

const TYPES: Record<string, InventoryTaxonomy["resourceType"]> = {
  items: "EQUIPMENT",
  upgrades: "UPGRADE_MATERIAL",
  shards: "SHARD",
  mythicShards: "MYTHIC_SHARD",
  xpBooks: "XP_BOOK",
  abilityBadges: "ABILITY_BADGE",
  components: "COMPONENT",
  forgeBadges: "FORGE_BADGE",
  orbs: "ORB",
  requisitionOrders: "REQUISITION_ORDER",
  resetStones: "RESET_STONE",
};

export function classifyInventory(input: {
  externalId: string;
  displayName: string | null;
  category: string;
  rarity: string | null;
  metadata: Record<string, unknown>;
}): InventoryTaxonomy {
  const resourceType = TYPES[input.category] ?? "UNKNOWN";
  const rawId = input.metadata.id;
  const subtype = typeof rawId === "string" ? rawId : input.rarity;
  const alliance = input.metadata.grandAlliance;
  const discriminator = input.externalId.split(":")[1];
  const allianceRestriction =
    typeof alliance === "string"
      ? alliance.toUpperCase()
      : ["imperial", "chaos", "xenos"].includes(discriminator)
        ? discriminator.toUpperCase()
        : null;
  return {
    resourceType,
    resourceSubtype: typeof subtype === "string" ? subtype : null,
    allianceRestriction,
    semanticStatus:
      resourceType === "UNKNOWN"
        ? "UNKNOWN"
        : [
              "SHARD",
              "MYTHIC_SHARD",
              "REQUISITION_ORDER",
              "RESET_STONE",
            ].includes(resourceType)
          ? "VERIFIED"
          : "PARTIAL",
    externalResourceId: typeof rawId === "string" ? rawId : input.externalId,
    displayName: input.displayName ?? `Unknown resource (${input.externalId})`,
  };
}
