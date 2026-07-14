-- AlterTable
ALTER TABLE "Character" ADD COLUMN "externalCharacterId" TEXT;
ALTER TABLE "Character" ADD COLUMN "externalDefinitionId" TEXT;
ALTER TABLE "Character" ADD COLUMN "lastSyncedAt" DATETIME;
ALTER TABLE "Character" ADD COLUMN "mythicShardsOwned" INTEGER;
ALTER TABLE "Character" ADD COLUMN "syncSource" TEXT;
ALTER TABLE "Character" ADD COLUMN "upstreamUpdatedAt" DATETIME;

-- CreateTable
CREATE TABLE "TacticusSyncPreview" (
    "id" TEXT NOT NULL PRIMARY KEY, "connectionId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL,
    "playerIdentity" TEXT NOT NULL, "upstreamLastUpdatedAt" DATETIME NOT NULL, "payloadJson" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TacticusSyncPreview_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "TacticusConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY, "externalInventoryId" TEXT NOT NULL, "displayName" TEXT,
    "category" TEXT NOT NULL, "rarity" TEXT, "quantity" INTEGER NOT NULL, "upstreamMetadataJson" TEXT,
    "lastSyncedAt" DATETIME NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "RosterSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY, "connectionId" TEXT NOT NULL, "syncRunId" TEXT NOT NULL,
    "identity" TEXT NOT NULL, "upstreamLastUpdatedAt" DATETIME NOT NULL, "characterCount" INTEGER NOT NULL,
    "inventoryCount" INTEGER NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RosterSnapshot_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "TacticusConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RosterSnapshot_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "TacticusSyncRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "CharacterChange" (
    "id" TEXT NOT NULL PRIMARY KEY, "snapshotId" TEXT NOT NULL, "characterId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL, "field" TEXT NOT NULL, "previousValue" TEXT, "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacterChange_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "RosterSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterChange_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "InventoryChange" (
    "id" TEXT NOT NULL PRIMARY KEY, "snapshotId" TEXT NOT NULL, "inventoryItemId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL, "field" TEXT NOT NULL, "previousValue" TEXT, "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryChange_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "RosterSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryChange_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TacticusSyncPreview_tokenHash_key" ON "TacticusSyncPreview"("tokenHash");
CREATE INDEX "TacticusSyncPreview_connectionId_createdAt_idx" ON "TacticusSyncPreview"("connectionId", "createdAt");
CREATE UNIQUE INDEX "InventoryItem_externalInventoryId_key" ON "InventoryItem"("externalInventoryId");
CREATE INDEX "InventoryItem_lastSyncedAt_idx" ON "InventoryItem"("lastSyncedAt");
CREATE UNIQUE INDEX "RosterSnapshot_identity_key" ON "RosterSnapshot"("identity");
CREATE INDEX "RosterSnapshot_syncRunId_idx" ON "RosterSnapshot"("syncRunId");
CREATE INDEX "CharacterChange_characterId_createdAt_idx" ON "CharacterChange"("characterId", "createdAt");
CREATE INDEX "CharacterChange_snapshotId_idx" ON "CharacterChange"("snapshotId");
CREATE INDEX "InventoryChange_inventoryItemId_createdAt_idx" ON "InventoryChange"("inventoryItemId", "createdAt");
CREATE INDEX "InventoryChange_snapshotId_idx" ON "InventoryChange"("snapshotId");
CREATE UNIQUE INDEX "Character_externalCharacterId_key" ON "Character"("externalCharacterId");
CREATE INDEX "Character_lastSyncedAt_idx" ON "Character"("lastSyncedAt");
CREATE INDEX "TacticusSyncRun_connectionId_startedAt_idx" ON "TacticusSyncRun"("connectionId", "startedAt");
