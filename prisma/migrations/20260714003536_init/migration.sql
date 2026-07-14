-- CreateTable
CREATE TABLE "Character" (
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
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "investmentStatus" TEXT NOT NULL DEFAULT 'MAINTAIN',
    "notes" TEXT,
    "isOwned" BOOLEAN NOT NULL DEFAULT true,
    "portraitUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "role" TEXT,
    "notes" TEXT,
    CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamMember_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UpgradeGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "targetRank" TEXT,
    "targetRarity" TEXT,
    "targetCharacterLevel" INTEGER,
    "targetActiveAbilityLevel" INTEGER,
    "targetPassiveAbilityLevel" INTEGER,
    "priority" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UpgradeGoal_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Character_slug_key" ON "Character"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_position_key" ON "TeamMember"("teamId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_characterId_key" ON "TeamMember"("teamId", "characterId");
