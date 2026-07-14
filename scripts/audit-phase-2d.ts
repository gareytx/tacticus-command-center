import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";
import { normalizeCampaigns } from "../src/lib/campaigns/domain";
import { normalizeLegendaryEvents } from "../src/lib/events/domain";

async function main() {
  const fixture = JSON.parse(
    readFileSync("test/fixtures/tacticus/player-state.sanitized.json", "utf8"),
  );
  const expectedCampaigns = normalizeCampaigns(
    fixture.player.progress.campaigns,
  );
  const expectedEvents = normalizeLegendaryEvents(
    fixture.player.progress.legendaryEvents,
  );
  const [
    campaigns,
    events,
    characters,
    machines,
    unknownUnits,
    inventory,
    teams,
    goals,
    verifications,
    characterNotes,
    teamMembers,
    manualUnitClassifications,
    manualCampaignClassifications,
    manualEventClassifications,
    priorities,
    investmentStatuses,
  ] = await Promise.all([
    db.campaignDefinition.findMany({ include: { progress: true } }),
    db.eventDefinition.findMany({ include: { progress: true } }),
    db.character.count({ where: { unitType: "CHARACTER" } }),
    db.character.count({ where: { unitType: "MACHINE_OF_WAR" } }),
    db.character.count({ where: { unitType: "UNKNOWN" } }),
    db.inventoryItem.count(),
    db.team.count(),
    db.upgradeGoal.count(),
    db.readinessVerification.count(),
    db.character.count({ where: { notes: { not: null } } }),
    db.teamMember.count(),
    db.character.count({ where: { unitTypeSource: "MANUAL" } }),
    db.campaignDefinition.count({ where: { typeSource: "MANUAL" } }),
    db.eventDefinition.count({ where: { typeSource: "MANUAL" } }),
    db.character.groupBy({ by: ["priority"], _count: true }),
    db.character.groupBy({ by: ["investmentStatus"], _count: true }),
  ]);
  const expectedBattleRecords = expectedCampaigns.reduce(
    (sum, item) => sum + item.battles.length,
    0,
  );
  const storedBattleRecords = campaigns.reduce(
    (sum, item) => sum + (item.progress?.battleRecordCount ?? 0),
    0,
  );
  const checks = {
    campaignRecords: campaigns.length === expectedCampaigns.length,
    uniqueCampaignKeys:
      new Set(campaigns.map((item) => item.externalKey)).size ===
      expectedCampaigns.length,
    repeatedEventCampaignPreserved:
      campaigns.filter((item) => item.externalCampaignId === "eventCampaign6")
        .length === 2,
    eventCampaignCompositeKeys: [
      "eventCampaign6::Standard",
      "eventCampaign6::Extremis",
    ].every((key) => campaigns.some((item) => item.externalKey === key)),
    battleRecordsPreserved:
      storedBattleRecords === expectedBattleRecords &&
      storedBattleRecords === 351,
    legendaryEvents: events.length === expectedEvents.length,
    laneRecordsPreserved:
      (events[0]?.progress?.laneCount ?? 0) === expectedEvents[0]?.lanes.length,
  };
  if (Object.values(checks).some((value) => !value))
    throw new Error(`Phase 2D audit failed: ${JSON.stringify(checks)}`);
  console.log(
    JSON.stringify(
      {
        checks,
        counts: {
          campaigns: campaigns.length,
          battleRecords: storedBattleRecords,
          events: events.length,
          lanes: events[0]?.progress?.laneCount ?? 0,
          characters,
          machines,
          unknownUnits,
          inventory,
          teams,
          goals,
          verifications,
          activeEvents: events.filter((event) => event.isActive === true)
            .length,
          campaignEvents: campaigns.filter(
            (campaign) => campaign.normalizedType === "EVENT",
          ).length,
          characterNotes,
          teamMembers,
          manualUnitClassifications,
          manualCampaignClassifications,
          manualEventClassifications,
          priorities: Object.fromEntries(
            priorities.map((item) => [item.priority, item._count]),
          ),
          investmentStatuses: Object.fromEntries(
            investmentStatuses.map((item) => [
              item.investmentStatus,
              item._count,
            ]),
          ),
        },
      },
      null,
      2,
    ),
  );
}
main().finally(() => db.$disconnect());
