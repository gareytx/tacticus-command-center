import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { classifyInventory } from "../src/lib/readiness/inventory-taxonomy";
import {
  normalizeInventory,
  previewPayloadSchema,
} from "../src/lib/tacticus/sync-domain";
import { describePreview } from "../src/services/tacticus-roster-sync.service";

const db = new PrismaClient();
const fixture = JSON.parse(
  readFileSync("test/fixtures/tacticus/player-state.sanitized.json", "utf8"),
);
const normalized = normalizeInventory(fixture.player.inventory);

function duplicateValues(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].filter(([, count]) => count > 1);
}

async function main() {
  const [stored, characters, connection, latestSnapshot] = await Promise.all([
    db.inventoryItem.findMany({ orderBy: { externalInventoryId: "asc" } }),
    db.character.findMany(),
    db.tacticusConnection.findFirst(),
    db.rosterSnapshot.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);
  const payload = previewPayloadSchema.parse({
    playerIdentity: fixture.player.details.name,
    upstreamLastUpdatedAt: new Date(
      fixture.metaData.lastUpdatedOn * 1000,
    ).toISOString(),
    responseSchemaVersion: fixture.metaData.configHash,
    characters: [],
    inventory: normalized,
  });
  const preview = describePreview(payload, characters, stored);
  const storedById = new Map(
    stored.map((item) => [item.externalInventoryId, item]),
  );
  const reconciliation = normalized.map((incoming) => {
    const persisted = storedById.get(incoming.externalId);
    const taxonomy = classifyInventory(incoming);
    const previewItem = preview.inventoryChanges.find(
      (item) => item.externalId === incoming.externalId,
    );
    return {
      outcome: persisted ? "Stored one-to-one" : "Unmatched",
      expectedFixtureSyncOutcome: "Stored one-to-one",
      preview: previewItem?.status ?? "UNMATCHED",
      externalId: incoming.externalId,
      category: incoming.category,
      displayName: taxonomy.displayName,
      resourceType: taxonomy.resourceType,
      subtype: taxonomy.resourceSubtype,
      rarity: incoming.rarity,
      alliance: taxonomy.allianceRestriction,
      incomingQuantity: incoming.quantity,
      storedQuantity: persisted?.quantity ?? null,
      storedResourceType: persisted?.resourceType ?? null,
      storedSubtype: persisted?.resourceSubtype ?? null,
      storedRarity: persisted?.rarity ?? null,
      storedAlliance: persisted?.allianceRestriction ?? null,
    };
  });
  const incomingIds = new Set(normalized.map((item) => item.externalId));
  const result = {
    counts: {
      incomingFixtureRecords: normalized.length,
      normalizedPrePersistence: normalized.length,
      uniqueExternalIds: incomingIds.size,
      uniquePersistenceKeys: incomingIds.size,
      storedDatabaseRows: stored.length,
      storedMatchingFixture: stored.filter((item) =>
        incomingIds.has(item.externalInventoryId),
      ).length,
      fixtureMissingFromDatabase: reconciliation.filter(
        (item) => item.outcome === "Unmatched",
      ).length,
      databaseRowsNotInFixture: stored.filter(
        (item) => !incomingIds.has(item.externalInventoryId),
      ).length,
      zeroQuantityIncoming: normalized.filter((item) => item.quantity === 0)
        .length,
      unknownNormalizedTypes: normalized.filter(
        (item) => classifyInventory(item).resourceType === "UNKNOWN",
      ).length,
      unknownSemanticStatuses: normalized.filter(
        (item) => classifyInventory(item).semanticStatus === "UNKNOWN",
      ).length,
    },
    duplicateExternalIds: duplicateValues(
      normalized.map((item) => item.externalId),
    ),
    categoryCounts: Object.fromEntries(
      [...new Set(normalized.map((item) => item.category))]
        .sort()
        .map((category) => [
          category,
          normalized.filter((item) => item.category === category).length,
        ]),
    ),
    resourceTypeCounts: Object.fromEntries(
      [
        ...new Set(
          normalized.map((item) => classifyInventory(item).resourceType),
        ),
      ]
        .sort()
        .map((resourceType) => [
          resourceType,
          normalized.filter(
            (item) => classifyInventory(item).resourceType === resourceType,
          ).length,
        ]),
    ),
    previewSummary: preview.summary,
    snapshots: {
      fixtureUpstreamLastUpdatedAt: new Date(
        fixture.metaData.lastUpdatedOn * 1000,
      ).toISOString(),
      databaseConnectionUpstreamLastUpdatedAt:
        connection?.upstreamLastUpdatedAt?.toISOString() ?? null,
      latestDatabaseSnapshotUpstreamLastUpdatedAt:
        latestSnapshot?.upstreamLastUpdatedAt.toISOString() ?? null,
      latestDatabaseSnapshotInventoryCount:
        latestSnapshot?.inventoryCount ?? null,
    },
    totalIncomingQuantity: normalized.reduce(
      (total, item) => total + item.quantity,
      0,
    ),
    totalStoredQuantityForFixtureIds: reconciliation.reduce(
      (total, item) => total + (item.storedQuantity ?? 0),
      0,
    ),
    missing: reconciliation.filter((item) => item.outcome === "Unmatched"),
    quantityDifferences: reconciliation.filter(
      (item) =>
        item.storedQuantity !== null &&
        item.storedQuantity !== item.incomingQuantity,
    ),
    taxonomyDifferences: reconciliation.filter(
      (item) =>
        item.storedQuantity !== null &&
        (item.storedResourceType !== item.resourceType ||
          item.storedSubtype !== item.subtype ||
          item.storedRarity !== item.rarity ||
          item.storedAlliance !== item.alliance),
    ),
    extra: stored
      .filter((item) => !incomingIds.has(item.externalInventoryId))
      .map((item) => ({
        externalId: item.externalInventoryId,
        category: item.category,
        displayName: item.displayName,
        quantity: item.quantity,
      })),
    reconciliation,
  };
  console.log(
    JSON.stringify(
      process.argv.includes("--summary")
        ? { ...result, reconciliation: undefined }
        : result,
      null,
      2,
    ),
  );
}

main().finally(() => db.$disconnect());
