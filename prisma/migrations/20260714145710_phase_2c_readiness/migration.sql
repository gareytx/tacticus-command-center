-- CreateTable
CREATE TABLE "ReadinessVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "characterId" TEXT,
    "opportunityType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReadinessVerification_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "faction" TEXT NOT NULL,
    "alliance" TEXT NOT NULL,
    "rarity" TEXT,
    "starLevel" INTEGER,
    "redStarLevel" INTEGER,
    "characterLevel" INTEGER,
    "rank" TEXT,
    "rankProgress" INTEGER,
    "activeAbilityLevel" INTEGER,
    "passiveAbilityLevel" INTEGER,
    "shardsOwned" INTEGER,
    "shardsRequired" INTEGER,
    "mythicShardsOwned" INTEGER,
    "externalCharacterId" TEXT,
    "externalDefinitionId" TEXT,
    "syncSource" TEXT,
    "lastSyncedAt" DATETIME,
    "upstreamUpdatedAt" DATETIME,
    "unitType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "unitTypeSource" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "unitTypeConfidence" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "investmentStatus" TEXT NOT NULL DEFAULT 'MAINTAIN',
    "notes" TEXT,
    "isOwned" BOOLEAN NOT NULL DEFAULT true,
    "portraitUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Character" ("activeAbilityLevel", "alliance", "characterLevel", "createdAt", "externalCharacterId", "externalDefinitionId", "faction", "id", "investmentStatus", "isOwned", "lastSyncedAt", "mythicShardsOwned", "name", "notes", "passiveAbilityLevel", "portraitUrl", "priority", "rank", "rankProgress", "rarity", "redStarLevel", "shardsOwned", "shardsRequired", "slug", "starLevel", "syncSource", "updatedAt", "upstreamUpdatedAt") SELECT "activeAbilityLevel", "alliance", "characterLevel", "createdAt", "externalCharacterId", "externalDefinitionId", "faction", "id", "investmentStatus", "isOwned", "lastSyncedAt", "mythicShardsOwned", "name", "notes", "passiveAbilityLevel", "portraitUrl", "priority", "rank", "rankProgress", "rarity", "redStarLevel", "shardsOwned", "shardsRequired", "slug", "starLevel", "syncSource", "updatedAt", "upstreamUpdatedAt" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE UNIQUE INDEX "Character_slug_key" ON "Character"("slug");
CREATE UNIQUE INDEX "Character_externalCharacterId_key" ON "Character"("externalCharacterId");
CREATE INDEX "Character_lastSyncedAt_idx" ON "Character"("lastSyncedAt");
CREATE TABLE "new_InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalInventoryId" TEXT NOT NULL,
    "displayName" TEXT,
    "category" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "resourceSubtype" TEXT,
    "allianceRestriction" TEXT,
    "semanticStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "externalResourceId" TEXT,
    "rarity" TEXT,
    "quantity" INTEGER NOT NULL,
    "upstreamMetadataJson" TEXT,
    "lastSyncedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_InventoryItem" ("category", "createdAt", "displayName", "externalInventoryId", "id", "lastSyncedAt", "quantity", "rarity", "updatedAt", "upstreamMetadataJson") SELECT "category", "createdAt", "displayName", "externalInventoryId", "id", "lastSyncedAt", "quantity", "rarity", "updatedAt", "upstreamMetadataJson" FROM "InventoryItem";
DROP TABLE "InventoryItem";
ALTER TABLE "new_InventoryItem" RENAME TO "InventoryItem";
CREATE UNIQUE INDEX "InventoryItem_externalInventoryId_key" ON "InventoryItem"("externalInventoryId");
CREATE INDEX "InventoryItem_lastSyncedAt_idx" ON "InventoryItem"("lastSyncedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ReadinessVerification_key_key" ON "ReadinessVerification"("key");

-- CreateIndex
CREATE INDEX "ReadinessVerification_characterId_idx" ON "ReadinessVerification"("characterId");

-- CreateIndex
CREATE INDEX "ReadinessVerification_status_idx" ON "ReadinessVerification"("status");
