import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { db as serviceDb } from "@/lib/db";
import { hashConfirmationToken } from "@/lib/tacticus/encryption";
import {
  normalizeCharacters,
  normalizeInventory,
  previewPayloadSchema,
} from "@/lib/tacticus/sync-domain";
import { describePreview } from "@/services/tacticus-roster-sync.service";

const fakeKey = "not-a-real-tacticus-player-key";
const db = new PrismaClient();
const fixture = JSON.parse(
  readFileSync("test/fixtures/tacticus/player-state.sanitized.json", "utf8"),
);
const fixturePayload = previewPayloadSchema.parse({
  playerIdentity: fixture.player.details.name,
  upstreamLastUpdatedAt: new Date(
    fixture.metaData.lastUpdatedOn * 1000,
  ).toISOString(),
  responseSchemaVersion: fixture.metaData.configHash,
  characters: normalizeCharacters(fixture.player.units),
  inventory: normalizeInventory(fixture.player.inventory),
});

test.afterAll(async () => {
  await Promise.all([db.$disconnect(), serviceDb.$disconnect()]);
});

test("integration page loads with a masked key field and safe failure", async ({
  page,
}) => {
  await page.route("**/api/integrations/tacticus/status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: false }),
    }),
  );
  await page.route("**/api/integrations/tacticus/test", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        code: "MISSING_PLAYER_SCOPE",
        message: "This key does not have Player read access.",
      }),
    }),
  );
  await page.goto("/settings/integrations/tacticus");
  await expect(
    page.getByRole("heading", { name: "Tacticus Player API" }),
  ).toBeVisible();
  const input = page.getByTestId("tacticus-api-key");
  await expect(input).toHaveAttribute("type", "password");
  await input.fill(fakeKey);
  await page.getByRole("button", { name: "Test Connection" }).click();
  await expect(
    page.getByText("This key does not have Player read access.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(input).toHaveValue("");
  expect(await page.content()).not.toContain(fakeKey);
});

test("connected-state UI renders from mocked server data", async ({ page }) => {
  await page.route("**/api/integrations/tacticus/status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        connected: true,
        playerName: "Mock Commander",
        maskedPlayerId: "Not exposed by API",
        status: "CONNECTED",
        lastAttemptedSyncAt: null,
        lastSuccessfulSyncAt: "2026-07-14T10:00:00.000Z",
        upstreamLastUpdatedAt: "2026-07-14T09:58:00.000Z",
        keyFingerprint: "0123456789abcdef",
        lastErrorCode: null,
        lastErrorMessage: null,
        syncRuns: [
          {
            id: "run-safe",
            status: "SUCCEEDED",
            startedAt: "2026-07-14T10:00:00.000Z",
            completedAt: "2026-07-14T10:00:01.000Z",
            recordsReceived: 171,
            errorMessage: null,
          },
        ],
      }),
    }),
  );
  await page.goto("/settings/integrations/tacticus");
  await expect(
    page.getByRole("heading", { name: "Mock Commander" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preview Sync" }),
  ).toBeVisible();
  await expect(page.getByText("0123456789abcdef")).toBeVisible();
  await expect(page.getByText("171 records")).toBeVisible();
  expect(await page.content()).not.toContain(fakeKey);
});

test("fixture preview applies transactionally and updates the dashboard without changing strategy", async ({
  page,
}) => {
  await db.tacticusConnection.deleteMany();
  await db.inventoryItem.deleteMany();
  await db.character.updateMany({
    data: {
      externalCharacterId: null,
      externalDefinitionId: null,
      syncSource: null,
      lastSyncedAt: null,
      upstreamUpdatedAt: null,
    },
  });
  await db.character.update({
    where: { slug: "bellator" },
    data: {
      priority: "CRITICAL",
      investmentStatus: "INVEST_NOW",
      notes: "Preserve this Bellator strategy note",
    },
  });
  const connection = await db.tacticusConnection.create({
    data: {
      encryptedApiKey: "test-only-ciphertext",
      encryptionIv: "test-only-iv",
      encryptionAuthTag: "test-only-tag",
      keyFingerprint: "0123456789abcdef",
      externalPlayerName: fixture.player.details.name,
      scopesJson: JSON.stringify(["Player"]),
    },
  });
  const payload = fixturePayload;
  const previewToken = "fixture-preview-token-" + "a".repeat(32);
  await db.tacticusSyncPreview.create({
    data: {
      connectionId: connection.id,
      tokenHash: hashConfirmationToken(previewToken),
      playerIdentity: payload.playerIdentity,
      upstreamLastUpdatedAt: new Date(payload.upstreamLastUpdatedAt),
      payloadJson: JSON.stringify(payload),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  const described = describePreview(
    payload,
    await db.character.findMany(),
    await db.inventoryItem.findMany(),
  );
  await page.route("**/api/integrations/tacticus/preview", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        previewToken,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        ...described,
      }),
    }),
  );
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/settings/integrations/tacticus");
  await page.getByRole("button", { name: "Preview Sync" }).click();
  await expect(page.getByTestId("character-sync-changes")).toContainText(
    "Bellator",
  );
  await expect(page.getByTestId("inventory-sync-changes")).toContainText(
    payload.inventory[0].displayName ?? payload.inventory[0].externalId,
  );
  await page.getByRole("button", { name: "Confirm and apply" }).click();
  await expect(page.getByText("59 synchronized characters")).toBeVisible();
  await expect(page.getByText("324 inventory records")).toBeVisible();
  await page.getByRole("link", { name: "View dashboard" }).click();
  const summary = page.getByTestId("tacticus-sync-summary");
  await expect(summary).toContainText("59");
  await expect(summary).toContainText("324");
  const bellator = await db.character.findUniqueOrThrow({
    where: { slug: "bellator" },
  });
  expect(bellator).toMatchObject({
    priority: "CRITICAL",
    investmentStatus: "INVEST_NOW",
    notes: "Preserve this Bellator strategy note",
  });
  expect(await db.character.count({ where: { syncSource: "TACTICUS" } })).toBe(
    59,
  );
  expect(await db.inventoryItem.count()).toBe(324);

  const repeatToken = "fixture-repeat-token-" + "b".repeat(32);
  await db.tacticusSyncPreview.create({
    data: {
      connectionId: connection.id,
      tokenHash: hashConfirmationToken(repeatToken),
      playerIdentity: payload.playerIdentity,
      upstreamLastUpdatedAt: new Date(payload.upstreamLastUpdatedAt),
      payloadJson: JSON.stringify(payload),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  const repeat = await page.request.post("/api/integrations/tacticus/apply", {
    data: { previewToken: repeatToken, confirmed: true },
  });
  expect(repeat.ok()).toBe(true);
  expect(await db.character.count({ where: { syncSource: "TACTICUS" } })).toBe(
    59,
  );
  expect(await db.inventoryItem.count()).toBe(324);
});

test("a database failure rolls the entire apply transaction back", async ({
  request,
}) => {
  const connection = await db.tacticusConnection.findFirstOrThrow();
  const collisionSlug = "rollback-unit-rollbackunit";
  await db.character.upsert({
    where: { slug: collisionSlug },
    update: { externalCharacterId: null },
    create: {
      name: "Local collision",
      slug: collisionSlug,
      faction: "Local",
      alliance: "IMPERIAL",
      notes: "This record must survive rollback",
    },
  });
  const rollbackPayload = previewPayloadSchema.parse({
    playerIdentity: connection.externalPlayerName,
    upstreamLastUpdatedAt: new Date().toISOString(),
    responseSchemaVersion: "rollback-test",
    characters: [
      {
        ...fixturePayload.characters[0],
        externalId: "rollbackUnit",
        definitionId: "rollbackUnit",
        name: "Rollback Unit",
        faction: "Test faction",
        alliance: "IMPERIAL",
      },
    ],
    inventory: [],
  });
  const token = "fixture-rollback-token-" + "c".repeat(32);
  await db.tacticusSyncPreview.create({
    data: {
      connectionId: connection.id,
      tokenHash: hashConfirmationToken(token),
      playerIdentity: rollbackPayload.playerIdentity,
      upstreamLastUpdatedAt: new Date(rollbackPayload.upstreamLastUpdatedAt),
      payloadJson: JSON.stringify(rollbackPayload),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  const before = {
    runs: await db.tacticusSyncRun.count(),
    snapshots: await db.rosterSnapshot.count(),
  };
  const response = await request.post("/api/integrations/tacticus/apply", {
    data: { previewToken: token, confirmed: true },
  });
  expect(response.status()).toBe(400);
  expect(await db.tacticusSyncRun.count()).toBe(before.runs);
  expect(await db.rosterSnapshot.count()).toBe(before.snapshots);
  expect(
    await db.character.count({
      where: { externalCharacterId: "rollbackUnit" },
    }),
  ).toBe(0);
  await expect(
    db.character.findUniqueOrThrow({ where: { slug: collisionSlug } }),
  ).resolves.toMatchObject({
    externalCharacterId: null,
    notes: "This record must survive rollback",
  });
});
