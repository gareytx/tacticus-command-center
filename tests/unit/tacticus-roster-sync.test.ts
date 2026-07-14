import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  normalizeCharacters,
  normalizeInventory,
  previewPayloadSchema,
} from "@/lib/tacticus/sync-domain";
import { normalizeCampaigns } from "@/lib/campaigns/domain";
import { normalizeLegendaryEvents } from "@/lib/events/domain";
import {
  describePreview,
  validateStoredPreview,
} from "@/services/tacticus-roster-sync.service";

const fixture = JSON.parse(
  readFileSync("test/fixtures/tacticus/player-state.sanitized.json", "utf8"),
);
const payload = previewPayloadSchema.parse({
  playerIdentity: fixture.player.details.name,
  upstreamLastUpdatedAt: new Date(
    fixture.metaData.lastUpdatedOn * 1000,
  ).toISOString(),
  responseSchemaVersion: fixture.metaData.configHash,
  characters: normalizeCharacters(fixture.player.units),
  inventory: normalizeInventory(fixture.player.inventory),
  campaigns: normalizeCampaigns(fixture.player.progress.campaigns),
  events: normalizeLegendaryEvents(fixture.player.progress.legendaryEvents),
});

function character(overrides: Record<string, unknown> = {}) {
  return {
    id: "local-character",
    name: "Local Character",
    slug: "local-character",
    faction: "Ultramarines",
    alliance: "IMPERIAL",
    rarity: null,
    starLevel: null,
    redStarLevel: null,
    characterLevel: null,
    rank: null,
    rankProgress: null,
    activeAbilityLevel: null,
    passiveAbilityLevel: null,
    shardsOwned: null,
    shardsRequired: null,
    mythicShardsOwned: null,
    externalCharacterId: null,
    externalDefinitionId: null,
    syncSource: null,
    lastSyncedAt: null,
    upstreamUpdatedAt: null,
    priority: "CRITICAL",
    investmentStatus: "INVEST_NOW",
    notes: "Keep this strategy note",
    isOwned: true,
    portraitUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as never;
}

describe("Phase 2B synchronization", () => {
  it("normalizes every fixture character and inventory category", () => {
    expect(payload.characters).toHaveLength(59);
    expect(payload.inventory).toHaveLength(324);
    expect(new Set(payload.inventory.map((item) => item.externalId)).size).toBe(
      324,
    );
    expect(new Set(payload.inventory.map((item) => item.category))).toEqual(
      new Set([
        "items",
        "upgrades",
        "shards",
        "xpBooks",
        "abilityBadges",
        "components",
        "forgeBadges",
        "orbs",
        "requisitionOrders",
        "resetStones",
      ]),
    );
  });

  it("matches a seeded character by the verified first-import mapping", () => {
    const seed = character({
      id: "local-bellator",
      name: "Bellator",
      slug: "bellator",
    });
    const preview = describePreview(
      {
        ...payload,
        characters: payload.characters.filter(
          (item) => item.externalId === "ultraInceptorSgt",
        ),
        inventory: [],
      },
      [seed],
      [],
    );
    expect(preview.characterChanges[0]).toMatchObject({
      characterId: "local-bellator",
      status: "UPDATE",
    });
    expect(
      preview.characterChanges[0].changes.map((change) => change.field),
    ).not.toContain("notes");
    expect(
      preview.characterChanges[0].changes.map((change) => change.field),
    ).not.toContain("priority");
  });

  it("uses an established external ID before any display-name heuristic", () => {
    const incoming = payload.characters.find(
      (item) => item.externalId === "ultraInceptorSgt",
    )!;
    const preview = describePreview(
      { ...payload, characters: [incoming], inventory: [] },
      [
        character({
          id: "external-match",
          name: "Renamed locally",
          slug: "not-the-seed-slug",
          externalCharacterId: incoming.externalId,
          characterLevel: incoming.characterLevel - 1,
        }),
      ],
      [],
    );
    expect(preview.characterChanges[0]).toMatchObject({
      characterId: "external-match",
      name: "Renamed locally",
      status: "UPDATE",
    });
  });

  it("creates complete unknown characters and marks incomplete ones unmatched", () => {
    const complete = payload.characters.find(
      (item) => item.externalId === "tauCrisis",
    )!;
    const preview = describePreview(
      {
        ...payload,
        characters: [
          complete,
          { ...complete, externalId: "future-unit", name: null },
        ],
        inventory: [],
      },
      [],
      [],
    );
    expect(preview.characterChanges.map((item) => item.status)).toEqual([
      "CREATE",
      "UNMATCHED",
    ]);
    expect(preview.summary.charactersUnmatched).toBe(1);
  });

  it("updates only API-owned character fields and leaves strategy fields out", () => {
    const incoming = payload.characters[0];
    const preview = describePreview(
      { ...payload, characters: [incoming], inventory: [] },
      [
        character({
          externalCharacterId: incoming.externalId,
          characterLevel: incoming.characterLevel - 1,
          notes: "Never replace",
          priority: "CRITICAL",
        }),
      ],
      [],
    );
    const fields = preview.characterChanges[0].changes.map(
      (change) => change.field,
    );
    expect(fields).toContain("characterLevel");
    expect(fields).not.toEqual(
      expect.arrayContaining([
        "priority",
        "investmentStatus",
        "notes",
        "teamMembers",
        "upgradeGoals",
      ]),
    );
  });

  it("classifies creates, quantity movement, unchanged, and duplicates", () => {
    const first = payload.inventory[0];
    const existing = {
      id: "inventory-1",
      externalInventoryId: first.externalId,
      displayName: first.displayName,
      category: first.category,
      resourceType: "UNKNOWN" as const,
      resourceSubtype: null,
      allianceRestriction: null,
      semanticStatus: "UNKNOWN" as const,
      externalResourceId: null,
      rarity: first.rarity,
      quantity: first.quantity - 1,
      upstreamMetadataJson: null,
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const preview = describePreview(
      {
        ...payload,
        characters: [payload.characters[0], payload.characters[0]],
        inventory: [first, payload.inventory[1]],
      },
      [],
      [existing],
    );
    expect(preview.inventoryChanges.map((item) => item.status)).toEqual([
      "INCREASE",
      "CREATE",
    ]);
    expect(preview.characterChanges.map((item) => item.status)).toEqual([
      "CREATE",
      "REJECTED",
    ]);
  });

  it("classifies inventory increases, decreases, creates, and unchanged records", () => {
    const [increase, decrease, unchanged, created] = payload.inventory.slice(
      0,
      4,
    );
    const existing = [
      [increase, increase.quantity - 1],
      [decrease, decrease.quantity + 1],
      [unchanged, unchanged.quantity],
    ].map(([item, quantity], index) => ({
      id: `inventory-${index}`,
      externalInventoryId: typeof item === "object" ? item.externalId : "",
      displayName: typeof item === "object" ? item.displayName : null,
      category: typeof item === "object" ? item.category : "items",
      resourceType: "UNKNOWN" as const,
      resourceSubtype: null,
      allianceRestriction: null,
      semanticStatus: "UNKNOWN" as const,
      externalResourceId: null,
      rarity: typeof item === "object" ? item.rarity : null,
      quantity: Number(quantity),
      upstreamMetadataJson: null,
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const preview = describePreview(
      {
        ...payload,
        characters: [],
        inventory: [increase, decrease, unchanged, created],
      },
      [],
      existing,
    );
    expect(preview.inventoryChanges.map((item) => item.status)).toEqual([
      "INCREASE",
      "DECREASE",
      "UNCHANGED",
      "CREATE",
    ]);
  });

  it("normalizes additive future inventory containers safely", () => {
    const normalized = normalizeInventory({
      ...fixture.player.inventory,
      futureCurrencies: [{ id: "future-credit", amount: 7, tier: "alpha" }],
      eventTokens: { summer: 4 },
    });
    expect(normalized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          externalId: "futureCurrencies::future-credit",
          category: "futureCurrencies",
          quantity: 7,
        }),
        expect.objectContaining({
          category: "eventTokens",
          quantity: 4,
        }),
      ]),
    );
  });

  it("rejects malformed required values at runtime", () => {
    expect(() =>
      previewPayloadSchema.parse({
        ...payload,
        characters: [{ ...payload.characters[0], characterLevel: -1 }],
      }),
    ).toThrow();
  });

  it("rejects expired previews and player identity changes", () => {
    const stored = {
      expiresAt: new Date("2026-07-14T12:00:00.000Z"),
      playerIdentity: payload.playerIdentity,
      payloadJson: JSON.stringify(payload),
      connection: { externalPlayerName: payload.playerIdentity },
    };
    expect(() =>
      validateStoredPreview(stored, new Date("2026-07-14T12:00:00.000Z")),
    ).toThrowError(expect.objectContaining({ code: "PREVIEW_EXPIRED" }));
    expect(() =>
      validateStoredPreview(
        {
          ...stored,
          expiresAt: new Date("2026-07-14T12:10:00.000Z"),
          connection: { externalPlayerName: "Different commander" },
        },
        new Date("2026-07-14T12:00:00.000Z"),
      ),
    ).toThrowError(expect.objectContaining({ code: "ACCOUNT_MISMATCH" }));
  });
});
