import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db";
import { normalizeCampaigns } from "../src/lib/campaigns/domain";
import { normalizeLegendaryEvents } from "../src/lib/events/domain";
import { previewPayloadSchema } from "../src/lib/tacticus/sync-domain";
import { hashConfirmationToken } from "../src/lib/tacticus/encryption";
import { applyTacticusRosterSync } from "../src/services/tacticus-roster-sync.service";

async function main() {
  const fixture = JSON.parse(
    readFileSync("test/fixtures/tacticus/player-state.sanitized.json", "utf8"),
  );
  const connection = await db.tacticusConnection.findFirst();
  if (!connection)
    throw new Error(
      "A confirmed local Tacticus connection is required before fixture backfill.",
    );
  if (!connection.externalPlayerName)
    throw new Error("The confirmed local connection has no player identity.");
  const upstreamLastUpdatedAt = new Date(fixture.metaData.lastUpdatedOn * 1000);
  const payload = previewPayloadSchema.parse({
    playerIdentity: connection.externalPlayerName,
    upstreamLastUpdatedAt: upstreamLastUpdatedAt.toISOString(),
    responseSchemaVersion: fixture.metaData.configHash,
    characters: [],
    inventory: [],
    campaigns: normalizeCampaigns(fixture.player.progress.campaigns),
    events: normalizeLegendaryEvents(fixture.player.progress.legendaryEvents),
  });
  const token = randomBytes(32).toString("base64url");
  await db.tacticusSyncPreview.deleteMany({
    where: { connectionId: connection.id },
  });
  await db.tacticusSyncPreview.create({
    data: {
      connectionId: connection.id,
      tokenHash: hashConfirmationToken(token),
      playerIdentity: payload.playerIdentity,
      upstreamLastUpdatedAt,
      payloadJson: JSON.stringify(payload),
      expiresAt: new Date(Date.now() + 600_000),
    },
  });
  const result = await applyTacticusRosterSync({
    previewToken: token,
    confirmed: true,
  });
  console.log(
    JSON.stringify(
      {
        status: result.status,
        campaignCount: result.campaignCount,
        eventCount: result.eventCount,
        appliedCampaigns: result.appliedCampaigns,
        appliedEvents: result.appliedEvents,
      },
      null,
      2,
    ),
  );
}

main().finally(() => db.$disconnect());
