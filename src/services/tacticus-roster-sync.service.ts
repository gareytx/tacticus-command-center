import "@/lib/tacticus/server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { OfficialTacticusApiClient } from "@/lib/tacticus/client";
import {
  decryptCredential,
  hashConfirmationToken,
} from "@/lib/tacticus/encryption";
import { TacticusError } from "@/lib/tacticus/errors";
import { summarizePlayerState } from "@/lib/tacticus/schemas";
import {
  applyRequestSchema,
  normalizeCharacters,
  normalizeInventory,
  previewPayloadSchema,
  slugFor,
  type CharacterSync,
  type PreviewPayload,
} from "@/lib/tacticus/sync-domain";
import type { TacticusApiClient } from "@/lib/tacticus/types";
import { classifyUnit } from "@/lib/readiness/unit-classification";
import { classifyInventory } from "@/lib/readiness/inventory-taxonomy";
import { normalizeCampaigns } from "@/lib/campaigns/domain";
import {
  eventProgressSummary,
  normalizeLegendaryEvents,
} from "@/lib/events/domain";

const PREVIEW_TTL_MS = 10 * 60 * 1000;
const SEEDED_EXTERNAL_IDS: Record<string, string> = {
  ultraInceptorSgt: "bellator",
  ultraTigurius: "varro-tigurius",
  ultraEliminatorSgt: "certus",
  darkaAzrael: "azrael",
  bloodDante: "dante",
  bloodIntercessor: "mataneo",
  necroSpyder: "aleph-null",
  necroOverlord: "anuphet",
  blackPossession: "archimatos",
  blackHaarken: "haarken-worldclaimer",
  eldarMauganRa: "maugan-ra",
};

type ExistingCharacter = Awaited<
  ReturnType<typeof db.character.findMany>
>[number];
type ExistingInventory = Awaited<
  ReturnType<typeof db.inventoryItem.findMany>
>[number];
type FieldChange = {
  field: string;
  previousValue: string | null;
  newValue: string | null;
};

const characterValues = (
  incoming: CharacterSync,
  existing?: ExistingCharacter | null,
) => ({
  isOwned: true,
  characterLevel: incoming.characterLevel,
  rank: incoming.rank === "UNKNOWN" ? null : incoming.rank,
  activeAbilityLevel: incoming.activeAbilityLevel,
  passiveAbilityLevel: incoming.passiveAbilityLevel,
  shardsOwned: incoming.shardsOwned,
  mythicShardsOwned: incoming.mythicShardsOwned,
  externalCharacterId: incoming.externalId,
  externalDefinitionId: incoming.definitionId,
  syncSource: "TACTICUS",
  ...(existing?.unitTypeSource === "MANUAL"
    ? {}
    : (() => {
        const classification = classifyUnit(incoming.externalId);
        return {
          unitType: classification.unitType,
          unitTypeSource: classification.source,
          unitTypeConfidence: classification.confidence,
        };
      })()),
});

function changes(
  current: Record<string, unknown> | null,
  next: Record<string, unknown>,
): FieldChange[] {
  return Object.entries(next).flatMap(([field, value]) => {
    const previous = current?.[field] ?? null;
    return previous === value
      ? []
      : [
          {
            field,
            previousValue: previous === null ? null : String(previous),
            newValue: value === null ? null : String(value),
          },
        ];
  });
}

export function describePreview(
  payload: PreviewPayload,
  characters: ExistingCharacter[],
  inventory: ExistingInventory[],
  campaigns: Array<{ id: string; externalKey: string }> = [],
  events: Array<{ id: string; externalKey: string }> = [],
) {
  const byExternal = new Map(
    characters
      .filter((c) => c.externalCharacterId)
      .map((c) => [c.externalCharacterId!, c]),
  );
  const bySlug = new Map(characters.map((c) => [c.slug, c]));
  const seenCharacters = new Set<string>();
  const characterChanges = payload.characters.map((incoming) => {
    if (seenCharacters.has(incoming.externalId))
      return {
        externalId: incoming.externalId,
        name: incoming.name ?? incoming.externalId,
        status: "REJECTED" as const,
        reason: "Duplicate external character ID",
        changes: [],
      };
    seenCharacters.add(incoming.externalId);
    const existing =
      byExternal.get(incoming.externalId) ??
      bySlug.get(SEEDED_EXTERNAL_IDS[incoming.externalId]);
    if (
      !existing &&
      (!incoming.name || !incoming.faction || incoming.alliance === "UNKNOWN")
    )
      return {
        externalId: incoming.externalId,
        name: incoming.name ?? incoming.externalId,
        status: "UNMATCHED" as const,
        reason: "Insufficient metadata for safe character creation",
        changes: [],
      };
    const diff = changes(
      existing as unknown as Record<string, unknown> | null,
      characterValues(incoming, existing),
    );
    return {
      externalId: incoming.externalId,
      name: existing?.name ?? incoming.name ?? incoming.externalId,
      characterId: existing?.id ?? null,
      status: existing
        ? diff.length
          ? ("UPDATE" as const)
          : ("UNCHANGED" as const)
        : ("CREATE" as const),
      changes: diff,
    };
  });
  const byInventory = new Map(
    inventory.map((item) => [item.externalInventoryId, item]),
  );
  const seenInventory = new Set<string>();
  const inventoryChanges = payload.inventory.map((incoming) => {
    if (seenInventory.has(incoming.externalId))
      return {
        externalId: incoming.externalId,
        name: incoming.displayName,
        category: incoming.category,
        status: "REJECTED" as const,
        reason: "Duplicate external inventory ID",
        previousQuantity: null,
        newQuantity: incoming.quantity,
      };
    seenInventory.add(incoming.externalId);
    const existing = byInventory.get(incoming.externalId);
    const status = !existing
      ? "CREATE"
      : existing.quantity === incoming.quantity
        ? "UNCHANGED"
        : incoming.quantity > existing.quantity
          ? "INCREASE"
          : "DECREASE";
    return {
      externalId: incoming.externalId,
      name: incoming.displayName,
      category: incoming.category,
      status,
      previousQuantity: existing?.quantity ?? null,
      newQuantity: incoming.quantity,
    };
  });
  const count = (items: Array<{ status: string }>, status: string) =>
    items.filter((item) => item.status === status).length;
  const describeDefinitions = <
    T extends { externalKey: string; displayName: string },
  >(
    incoming: T[],
    existing: Array<{ id: string; externalKey: string }>,
  ) => {
    const byKey = new Map(existing.map((item) => [item.externalKey, item]));
    const seen = new Set<string>();
    return incoming.map((item) => {
      if (seen.has(item.externalKey))
        return {
          externalKey: item.externalKey,
          name: item.displayName,
          status: "REJECTED" as const,
          reason: "Duplicate persistence key",
        };
      seen.add(item.externalKey);
      const match = byKey.get(item.externalKey);
      return {
        externalKey: item.externalKey,
        name: item.displayName,
        id: match?.id ?? null,
        status: match ? ("UPDATE" as const) : ("CREATE" as const),
      };
    });
  };
  const campaignChanges = describeDefinitions(payload.campaigns, campaigns);
  const eventChanges = describeDefinitions(payload.events, events);
  return {
    summary: {
      charactersReceived: payload.characters.length,
      charactersToCreate: count(characterChanges, "CREATE"),
      charactersToUpdate: count(characterChanges, "UPDATE"),
      charactersUnchanged: count(characterChanges, "UNCHANGED"),
      charactersUnmatched: count(characterChanges, "UNMATCHED"),
      inventoryRecordsReceived: payload.inventory.length,
      inventoryRecordsToCreate: count(inventoryChanges, "CREATE"),
      inventoryQuantityChanges:
        count(inventoryChanges, "INCREASE") +
        count(inventoryChanges, "DECREASE"),
      campaignsReceived: payload.campaigns.length,
      campaignsToCreate: count(campaignChanges, "CREATE"),
      eventsReceived: payload.events.length,
      eventsToCreate: count(eventChanges, "CREATE"),
      rejectedRecords:
        count(characterChanges, "REJECTED") +
        count(inventoryChanges, "REJECTED") +
        count(campaignChanges, "REJECTED") +
        count(eventChanges, "REJECTED"),
    },
    characterChanges,
    inventoryChanges,
    campaignChanges,
    eventChanges,
  };
}

export function validateStoredPreview(
  preview: {
    expiresAt: Date;
    playerIdentity: string;
    payloadJson: string;
    connection: { externalPlayerName: string | null };
  } | null,
  now: Date,
) {
  if (!preview || preview.expiresAt <= now)
    throw new TacticusError("PREVIEW_EXPIRED");
  if (preview.connection.externalPlayerName !== preview.playerIdentity)
    throw new TacticusError("ACCOUNT_MISMATCH");
  return previewPayloadSchema.parse(JSON.parse(preview.payloadJson));
}

export async function previewTacticusRosterSync(
  dependencies: { client?: TacticusApiClient; now?: () => Date } = {},
) {
  const now = dependencies.now?.() ?? new Date();
  const connection = await db.tacticusConnection.findFirst();
  if (!connection) throw new TacticusError("UNKNOWN_UPSTREAM");
  const apiKey = decryptCredential({
    ciphertext: connection.encryptedApiKey,
    iv: connection.encryptionIv,
    authTag: connection.encryptionAuthTag,
    version: connection.encryptionVersion as 1,
  });
  const state = await (
    dependencies.client ?? new OfficialTacticusApiClient()
  ).getPlayerState(apiKey);
  const summary = summarizePlayerState(state, now);
  if (
    connection.externalPlayerName &&
    connection.externalPlayerName !== summary.playerName
  )
    throw new TacticusError("ACCOUNT_MISMATCH");
  const payload = previewPayloadSchema.parse({
    playerIdentity: summary.playerName,
    upstreamLastUpdatedAt: summary.upstreamLastUpdatedAt.toISOString(),
    responseSchemaVersion: summary.responseSchemaVersion,
    characters: normalizeCharacters(state.player.units),
    inventory: normalizeInventory(state.player.inventory),
    campaigns: normalizeCampaigns(
      Array.isArray(
        (state.player.progress as Record<string, unknown>).campaigns,
      )
        ? ((state.player.progress as Record<string, unknown>)
            .campaigns as unknown[])
        : [],
    ),
    events: normalizeLegendaryEvents(
      Array.isArray(
        (state.player.progress as Record<string, unknown>).legendaryEvents,
      )
        ? ((state.player.progress as Record<string, unknown>)
            .legendaryEvents as unknown[])
        : [],
    ),
  });
  const [characters, inventory, campaigns, events] = await Promise.all([
    db.character.findMany(),
    db.inventoryItem.findMany(),
    db.campaignDefinition.findMany({ select: { id: true, externalKey: true } }),
    db.eventDefinition.findMany({ select: { id: true, externalKey: true } }),
  ]);
  const preview = describePreview(
    payload,
    characters,
    inventory,
    campaigns,
    events,
  );
  const previewToken = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.tacticusSyncPreview.deleteMany({
      where: { connectionId: connection.id },
    }),
    db.tacticusSyncPreview.create({
      data: {
        connectionId: connection.id,
        tokenHash: hashConfirmationToken(previewToken),
        playerIdentity: summary.playerName,
        upstreamLastUpdatedAt: summary.upstreamLastUpdatedAt,
        payloadJson: JSON.stringify(payload),
        expiresAt: new Date(now.getTime() + PREVIEW_TTL_MS),
      },
    }),
  ]);
  return {
    previewToken,
    expiresAt: new Date(now.getTime() + PREVIEW_TTL_MS).toISOString(),
    upstreamLastUpdatedAt: payload.upstreamLastUpdatedAt,
    ...preview,
  };
}

export async function applyTacticusRosterSync(
  input: unknown,
  dependencies: { now?: () => Date } = {},
) {
  const request = applyRequestSchema.safeParse(input);
  if (!request.success) throw new TacticusError("MALFORMED_RESPONSE");
  const now = dependencies.now?.() ?? new Date();
  const preview = await db.tacticusSyncPreview.findUnique({
    where: { tokenHash: hashConfirmationToken(request.data.previewToken) },
    include: { connection: true },
  });
  if (!preview) throw new TacticusError("PREVIEW_EXPIRED");
  const payload = validateStoredPreview(preview, now);
  const [characters, inventory, campaigns, events] = await Promise.all([
    db.character.findMany(),
    db.inventoryItem.findMany(),
    db.campaignDefinition.findMany({ select: { id: true, externalKey: true } }),
    db.eventDefinition.findMany({ select: { id: true, externalKey: true } }),
  ]);
  const described = describePreview(
    payload,
    characters,
    inventory,
    campaigns,
    events,
  );
  if (described.summary.rejectedRecords)
    throw new TacticusError("MALFORMED_RESPONSE");
  const result = await db.$transaction(async (tx) => {
    const run = await tx.tacticusSyncRun.create({
      data: {
        connectionId: preview.connectionId,
        status: "RUNNING",
        startedAt: now,
        upstreamLastUpdatedAt: new Date(payload.upstreamLastUpdatedAt),
        responseSchemaVersion: payload.responseSchemaVersion,
        recordsReceived:
          payload.characters.length +
          payload.inventory.length +
          payload.campaigns.length +
          payload.events.length,
      },
    });
    const snapshot = await tx.rosterSnapshot.create({
      data: {
        connectionId: preview.connectionId,
        syncRunId: run.id,
        identity: `${preview.connectionId}:${payload.upstreamLastUpdatedAt}:${run.id}`,
        upstreamLastUpdatedAt: new Date(payload.upstreamLastUpdatedAt),
        characterCount: payload.characters.length,
        inventoryCount: payload.inventory.length,
        campaignCount: payload.campaigns.length,
        eventCount: payload.events.length,
      },
    });
    let appliedCharacters = 0,
      appliedInventory = 0,
      appliedCampaigns = 0,
      appliedEvents = 0;
    for (const item of described.characterChanges) {
      if (item.status === "UNMATCHED") continue;
      const incoming = payload.characters.find(
        (candidate) => candidate.externalId === item.externalId,
      )!;
      const data = {
        ...characterValues(
          incoming,
          characters.find((candidate) => candidate.id === item.characterId),
        ),
        lastSyncedAt: now,
        upstreamUpdatedAt: new Date(payload.upstreamLastUpdatedAt),
      };
      const character = item.characterId
        ? await tx.character.update({
            where: { id: item.characterId },
            data: data as never,
          })
        : await tx.character.create({
            data: {
              name: incoming.name!,
              slug: slugFor(incoming.name!, incoming.externalId),
              faction: incoming.faction!,
              alliance: incoming.alliance as "IMPERIAL" | "CHAOS" | "XENOS",
              ...data,
            } as never,
          });
      for (const change of item.changes)
        await tx.characterChange.create({
          data: {
            snapshotId: snapshot.id,
            characterId: character.id,
            externalId: incoming.externalId,
            ...change,
          },
        });
      if (item.status !== "UNCHANGED") appliedCharacters++;
    }
    for (const item of described.inventoryChanges) {
      const incoming = payload.inventory.find(
        (candidate) => candidate.externalId === item.externalId,
      )!;
      const taxonomy = classifyInventory(incoming);
      const inventoryItem = await tx.inventoryItem.upsert({
        where: { externalInventoryId: incoming.externalId },
        create: {
          externalInventoryId: incoming.externalId,
          displayName: taxonomy.displayName,
          category: incoming.category,
          resourceType: taxonomy.resourceType,
          resourceSubtype: taxonomy.resourceSubtype,
          allianceRestriction: taxonomy.allianceRestriction,
          semanticStatus: taxonomy.semanticStatus,
          externalResourceId: taxonomy.externalResourceId,
          rarity: incoming.rarity,
          quantity: incoming.quantity,
          upstreamMetadataJson: JSON.stringify(incoming.metadata),
          lastSyncedAt: now,
        },
        update: {
          displayName: taxonomy.displayName,
          category: incoming.category,
          resourceType: taxonomy.resourceType,
          resourceSubtype: taxonomy.resourceSubtype,
          allianceRestriction: taxonomy.allianceRestriction,
          semanticStatus: taxonomy.semanticStatus,
          externalResourceId: taxonomy.externalResourceId,
          rarity: incoming.rarity,
          quantity: incoming.quantity,
          upstreamMetadataJson: JSON.stringify(incoming.metadata),
          lastSyncedAt: now,
        },
      });
      if (item.status !== "UNCHANGED") {
        await tx.inventoryChange.create({
          data: {
            snapshotId: snapshot.id,
            inventoryItemId: inventoryItem.id,
            externalId: incoming.externalId,
            field: "quantity",
            previousValue:
              item.previousQuantity === null
                ? null
                : String(item.previousQuantity),
            newValue: String(item.newQuantity),
          },
        });
        appliedInventory++;
      }
    }
    for (const incoming of payload.campaigns) {
      const existing = await tx.campaignDefinition.findUnique({
        where: { externalKey: incoming.externalKey },
        include: { progress: true },
      });
      const definition = await tx.campaignDefinition.upsert({
        where: { externalKey: incoming.externalKey },
        create: {
          externalKey: incoming.externalKey,
          externalCampaignId: incoming.externalCampaignId,
          displayName: incoming.displayName,
          upstreamType: incoming.upstreamType,
          normalizedType: incoming.normalizedType,
          typeSource: incoming.typeSource,
          confidence: incoming.confidence,
          semanticStatus: incoming.semanticStatus,
          isActive: incoming.isActive,
          startsAt: incoming.startsAt ? new Date(incoming.startsAt) : null,
          endsAt: incoming.endsAt ? new Date(incoming.endsAt) : null,
          upstreamMetadataJson: JSON.stringify(incoming.metadata),
          lastSyncedAt: now,
        },
        update: {
          externalCampaignId: incoming.externalCampaignId,
          upstreamType: incoming.upstreamType,
          ...(existing?.displayNameSource === "MANUAL"
            ? {}
            : { displayName: incoming.displayName }),
          ...(existing?.typeSource === "MANUAL"
            ? {}
            : {
                normalizedType: incoming.normalizedType,
                typeSource: incoming.typeSource,
                confidence: incoming.confidence,
              }),
          semanticStatus: incoming.semanticStatus,
          isActive: incoming.isActive,
          startsAt: incoming.startsAt ? new Date(incoming.startsAt) : null,
          endsAt: incoming.endsAt ? new Date(incoming.endsAt) : null,
          upstreamMetadataJson: JSON.stringify(incoming.metadata),
          lastSyncedAt: now,
        },
      });
      const progressData = {
        battleRecordCount: incoming.battles.length,
        completedNodes: null,
        totalNodes: null,
        earnedStars: null,
        availableStars: null,
        currentNode: null,
        highestUnlockedNode: null,
        lastCompletedNode: null,
        rawProgressJson: JSON.stringify(incoming.battles),
        upstreamLastUpdatedAt: new Date(payload.upstreamLastUpdatedAt),
        lastSyncedAt: now,
      };
      await tx.campaignProgress.upsert({
        where: { campaignId: definition.id },
        create: { campaignId: definition.id, ...progressData },
        update: progressData,
      });
      const previous = existing?.progress;
      for (const change of changes(
        previous as unknown as Record<string, unknown> | null,
        {
          battleRecordCount: incoming.battles.length,
          rawProgressJson: JSON.stringify(incoming.battles),
        },
      ))
        await tx.campaignProgressChange.create({
          data: {
            snapshotId: snapshot.id,
            campaignId: definition.id,
            externalId: incoming.externalKey,
            ...change,
          },
        });
      if (
        !existing ||
        previous?.rawProgressJson !== JSON.stringify(incoming.battles)
      )
        appliedCampaigns++;
    }
    for (const incoming of payload.events) {
      const existing = await tx.eventDefinition.findUnique({
        where: { externalKey: incoming.externalKey },
        include: { progress: true },
      });
      const definition = await tx.eventDefinition.upsert({
        where: { externalKey: incoming.externalKey },
        create: {
          externalKey: incoming.externalKey,
          externalEventId: incoming.externalEventId,
          displayName: incoming.displayName,
          eventType: incoming.eventType,
          typeSource: incoming.typeSource,
          confidence: incoming.confidence,
          semanticStatus: incoming.semanticStatus,
          isActive: incoming.isActive,
          startsAt: null,
          endsAt: null,
          upstreamMetadataJson: JSON.stringify(incoming.metadata),
          lastSyncedAt: now,
        },
        update: {
          externalEventId: incoming.externalEventId,
          ...(existing?.displayNameSource === "MANUAL"
            ? {}
            : { displayName: incoming.displayName }),
          ...(existing?.typeSource === "MANUAL"
            ? {}
            : {
                eventType: incoming.eventType,
                typeSource: incoming.typeSource,
                confidence: incoming.confidence,
              }),
          semanticStatus: incoming.semanticStatus,
          isActive: incoming.isActive,
          upstreamMetadataJson: JSON.stringify(incoming.metadata),
          lastSyncedAt: now,
        },
      });
      const summary = eventProgressSummary(incoming);
      const progressData = {
        ...summary,
        completedMilestones: null,
        totalMilestones: null,
        rawProgressJson: JSON.stringify({
          lanes: incoming.lanes,
          currentEvent: incoming.currentEvent,
        }),
        upstreamLastUpdatedAt: new Date(payload.upstreamLastUpdatedAt),
        lastSyncedAt: now,
      };
      await tx.eventProgress.upsert({
        where: { eventId: definition.id },
        create: { eventId: definition.id, ...progressData },
        update: progressData,
      });
      const previous = existing?.progress;
      for (const change of changes(
        previous as unknown as Record<string, unknown> | null,
        {
          currentPoints: summary.currentPoints,
          currentCurrency: summary.currentCurrency,
          currentShards: summary.currentShards,
          currentClaimedChestIndex: summary.currentClaimedChestIndex,
          laneCount: summary.laneCount,
          rawProgressJson: progressData.rawProgressJson,
        },
      ))
        await tx.eventProgressChange.create({
          data: {
            snapshotId: snapshot.id,
            eventId: definition.id,
            externalId: incoming.externalKey,
            ...change,
          },
        });
      if (
        !existing ||
        previous?.rawProgressJson !== progressData.rawProgressJson
      )
        appliedEvents++;
    }
    await tx.tacticusSyncRun.update({
      where: { id: run.id },
      data: { status: "SUCCEEDED", completedAt: now },
    });
    await tx.tacticusConnection.update({
      where: { id: preview.connectionId },
      data: {
        status: "CONNECTED",
        lastAttemptedSyncAt: now,
        lastSuccessfulSyncAt: now,
        upstreamLastUpdatedAt: new Date(payload.upstreamLastUpdatedAt),
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
    await tx.tacticusSyncPreview.delete({ where: { id: preview.id } });
    return {
      snapshotId: snapshot.id,
      appliedCharacters,
      appliedInventory,
      appliedCampaigns,
      appliedEvents,
    };
  });
  await import("@/services/recommendation.service")
    .then(({ regenerateRecommendations }) => regenerateRecommendations({ now }))
    .catch(() => undefined);
  return {
    status: "SUCCEEDED" as const,
    ...result,
    rosterCount: await db.character.count(),
    synchronizedCharacterCount: await db.character.count({
      where: { syncSource: "TACTICUS" },
    }),
    inventoryCount: await db.inventoryItem.count(),
    campaignCount: await db.campaignDefinition.count(),
    eventCount: await db.eventDefinition.count(),
    unmatched: described.summary.charactersUnmatched,
  };
}
