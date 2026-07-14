-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "advisorSource" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "confidence" TEXT NOT NULL,
    "priorityScore" INTEGER NOT NULL,
    "durationCategory" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "explanation" TEXT,
    "limitations" TEXT,
    "evidenceJson" TEXT NOT NULL,
    "targetEntityType" TEXT,
    "targetEntityId" TEXT,
    "targetLabel" TEXT,
    "lifecycleKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "sourceSyncRunId" TEXT,
    "sourceSnapshotId" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "staleAt" DATETIME,
    "dismissedAt" DATETIME,
    "snoozedUntil" DATETIME,
    "completedAt" DATETIME,
    "supersededAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recommendation_sourceSyncRunId_fkey" FOREIGN KEY ("sourceSyncRunId") REFERENCES "TacticusSyncRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "RosterSnapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecommendationFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recommendationId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecommendationFeedback_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StrategicSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "objectiveType" TEXT,
    "objectiveEntityType" TEXT,
    "objectiveEntityId" TEXT,
    "objectiveLabel" TEXT,
    "reflectionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reflectionIndex" INTEGER NOT NULL DEFAULT 0,
    "preferredTimeBudget" INTEGER NOT NULL DEFAULT 20,
    "customTimeBudget" INTEGER,
    "lastRecommendationRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_fingerprint_key" ON "Recommendation"("fingerprint");

-- CreateIndex
CREATE INDEX "Recommendation_status_priorityScore_idx" ON "Recommendation"("status", "priorityScore");

-- CreateIndex
CREATE INDEX "Recommendation_confidence_idx" ON "Recommendation"("confidence");

-- CreateIndex
CREATE INDEX "Recommendation_targetEntityType_targetEntityId_idx" ON "Recommendation"("targetEntityType", "targetEntityId");

-- CreateIndex
CREATE INDEX "Recommendation_expiresAt_idx" ON "Recommendation"("expiresAt");

-- CreateIndex
CREATE INDEX "Recommendation_generatedAt_idx" ON "Recommendation"("generatedAt");

-- CreateIndex
CREATE INDEX "Recommendation_lifecycleKey_idx" ON "Recommendation"("lifecycleKey");

-- CreateIndex
CREATE INDEX "RecommendationFeedback_recommendationId_createdAt_idx" ON "RecommendationFeedback"("recommendationId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationFeedback_response_idx" ON "RecommendationFeedback"("response");

-- CreateIndex
CREATE INDEX "StrategicSettings_objectiveEntityType_objectiveEntityId_idx" ON "StrategicSettings"("objectiveEntityType", "objectiveEntityId");
