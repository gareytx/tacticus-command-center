-- CreateTable
CREATE TABLE "CampaignDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalKey" TEXT NOT NULL,
    "externalCampaignId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "displayNameSource" TEXT NOT NULL DEFAULT 'API',
    "upstreamType" TEXT NOT NULL,
    "normalizedType" TEXT NOT NULL,
    "typeSource" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "semanticStatus" TEXT NOT NULL,
    "isActive" BOOLEAN,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "upstreamMetadataJson" TEXT,
    "lastSyncedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CampaignProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "battleRecordCount" INTEGER NOT NULL,
    "completedNodes" INTEGER,
    "totalNodes" INTEGER,
    "earnedStars" INTEGER,
    "availableStars" INTEGER,
    "currentNode" TEXT,
    "highestUnlockedNode" TEXT,
    "lastCompletedNode" TEXT,
    "rawProgressJson" TEXT NOT NULL,
    "upstreamLastUpdatedAt" DATETIME NOT NULL,
    "lastSyncedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignProgress_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CampaignDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "currentObjective" TEXT,
    "targetObjective" TEXT,
    "blockerSummary" TEXT,
    "strategyNotes" TEXT,
    "preferredTeamId" TEXT,
    "targetDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignPlan_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CampaignDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignPlan_preferredTeamId_fkey" FOREIGN KEY ("preferredTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignPlanChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignPlanId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignPlanChange_campaignPlanId_fkey" FOREIGN KEY ("campaignPlanId") REFERENCES "CampaignPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignProgressChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignProgressChange_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "RosterSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignProgressChange_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CampaignDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalKey" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "displayNameSource" TEXT NOT NULL DEFAULT 'API',
    "eventType" TEXT NOT NULL,
    "typeSource" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "semanticStatus" TEXT NOT NULL,
    "isActive" BOOLEAN,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "upstreamMetadataJson" TEXT,
    "lastSyncedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EventProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "currentPoints" INTEGER,
    "currentCurrency" INTEGER NOT NULL,
    "currentShards" INTEGER NOT NULL,
    "currentClaimedChestIndex" INTEGER NOT NULL,
    "laneCount" INTEGER NOT NULL,
    "completedMilestones" INTEGER,
    "totalMilestones" INTEGER,
    "currentStage" TEXT,
    "tokensCurrent" INTEGER,
    "tokensMax" INTEGER,
    "nextTokenInSeconds" INTEGER,
    "tokenRegenDelay" INTEGER,
    "rawProgressJson" TEXT NOT NULL,
    "upstreamLastUpdatedAt" DATETIME NOT NULL,
    "lastSyncedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventProgress_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "EventDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "currentObjective" TEXT,
    "targetObjective" TEXT,
    "blockerSummary" TEXT,
    "strategyNotes" TEXT,
    "preferredTeamId" TEXT,
    "targetDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventPlan_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "EventDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventPlan_preferredTeamId_fkey" FOREIGN KEY ("preferredTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventPlanChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventPlanId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventPlanChange_eventPlanId_fkey" FOREIGN KEY ("eventPlanId") REFERENCES "EventPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventProgressChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventProgressChange_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "RosterSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventProgressChange_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "EventDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RosterSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "syncRunId" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "upstreamLastUpdatedAt" DATETIME NOT NULL,
    "characterCount" INTEGER NOT NULL,
    "inventoryCount" INTEGER NOT NULL,
    "campaignCount" INTEGER NOT NULL DEFAULT 0,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RosterSnapshot_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "TacticusConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RosterSnapshot_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "TacticusSyncRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RosterSnapshot" ("characterCount", "connectionId", "createdAt", "id", "identity", "inventoryCount", "syncRunId", "upstreamLastUpdatedAt") SELECT "characterCount", "connectionId", "createdAt", "id", "identity", "inventoryCount", "syncRunId", "upstreamLastUpdatedAt" FROM "RosterSnapshot";
DROP TABLE "RosterSnapshot";
ALTER TABLE "new_RosterSnapshot" RENAME TO "RosterSnapshot";
CREATE UNIQUE INDEX "RosterSnapshot_identity_key" ON "RosterSnapshot"("identity");
CREATE INDEX "RosterSnapshot_syncRunId_idx" ON "RosterSnapshot"("syncRunId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CampaignDefinition_externalKey_key" ON "CampaignDefinition"("externalKey");

-- CreateIndex
CREATE INDEX "CampaignDefinition_externalCampaignId_idx" ON "CampaignDefinition"("externalCampaignId");

-- CreateIndex
CREATE INDEX "CampaignDefinition_normalizedType_semanticStatus_idx" ON "CampaignDefinition"("normalizedType", "semanticStatus");

-- CreateIndex
CREATE INDEX "CampaignDefinition_isActive_endsAt_idx" ON "CampaignDefinition"("isActive", "endsAt");

-- CreateIndex
CREATE INDEX "CampaignDefinition_lastSyncedAt_idx" ON "CampaignDefinition"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignProgress_campaignId_key" ON "CampaignProgress"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPlan_campaignId_key" ON "CampaignPlan"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignPlan_status_priority_idx" ON "CampaignPlan"("status", "priority");

-- CreateIndex
CREATE INDEX "CampaignPlan_preferredTeamId_idx" ON "CampaignPlan"("preferredTeamId");

-- CreateIndex
CREATE INDEX "CampaignPlanChange_campaignPlanId_createdAt_idx" ON "CampaignPlanChange"("campaignPlanId", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignProgressChange_campaignId_createdAt_idx" ON "CampaignProgressChange"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignProgressChange_snapshotId_idx" ON "CampaignProgressChange"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "EventDefinition_externalKey_key" ON "EventDefinition"("externalKey");

-- CreateIndex
CREATE INDEX "EventDefinition_externalEventId_idx" ON "EventDefinition"("externalEventId");

-- CreateIndex
CREATE INDEX "EventDefinition_eventType_semanticStatus_idx" ON "EventDefinition"("eventType", "semanticStatus");

-- CreateIndex
CREATE INDEX "EventDefinition_isActive_endsAt_idx" ON "EventDefinition"("isActive", "endsAt");

-- CreateIndex
CREATE INDEX "EventDefinition_lastSyncedAt_idx" ON "EventDefinition"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventProgress_eventId_key" ON "EventProgress"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPlan_eventId_key" ON "EventPlan"("eventId");

-- CreateIndex
CREATE INDEX "EventPlan_status_priority_idx" ON "EventPlan"("status", "priority");

-- CreateIndex
CREATE INDEX "EventPlan_preferredTeamId_idx" ON "EventPlan"("preferredTeamId");

-- CreateIndex
CREATE INDEX "EventPlanChange_eventPlanId_createdAt_idx" ON "EventPlanChange"("eventPlanId", "createdAt");

-- CreateIndex
CREATE INDEX "EventProgressChange_eventId_createdAt_idx" ON "EventProgressChange"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "EventProgressChange_snapshotId_idx" ON "EventProgressChange"("snapshotId");
