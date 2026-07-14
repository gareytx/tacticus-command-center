-- CreateTable
CREATE TABLE "TacticusConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "encryptedApiKey" TEXT NOT NULL,
    "encryptionIv" TEXT NOT NULL,
    "encryptionAuthTag" TEXT NOT NULL,
    "encryptionVersion" INTEGER NOT NULL DEFAULT 1,
    "keyFingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "externalPlayerId" TEXT,
    "externalPlayerName" TEXT,
    "scopesJson" TEXT,
    "upstreamLastUpdatedAt" DATETIME,
    "lastAttemptedSyncAt" DATETIME,
    "lastSuccessfulSyncAt" DATETIME,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TacticusPendingConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "encryptedApiKey" TEXT NOT NULL,
    "encryptionIv" TEXT NOT NULL,
    "encryptionAuthTag" TEXT NOT NULL,
    "encryptionVersion" INTEGER NOT NULL DEFAULT 1,
    "keyFingerprint" TEXT NOT NULL,
    "confirmationTokenHash" TEXT NOT NULL,
    "externalPlayerName" TEXT NOT NULL,
    "scopesJson" TEXT NOT NULL,
    "upstreamLastUpdatedAt" DATETIME NOT NULL,
    "unitCount" INTEGER NOT NULL DEFAULT 0,
    "inventoryRecordCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TacticusSyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "upstreamLastUpdatedAt" DATETIME,
    "responseSchemaVersion" TEXT,
    "recordsReceived" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    CONSTRAINT "TacticusSyncRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "TacticusConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TacticusConnection_keyFingerprint_key" ON "TacticusConnection"("keyFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "TacticusPendingConnection_confirmationTokenHash_key" ON "TacticusPendingConnection"("confirmationTokenHash");
