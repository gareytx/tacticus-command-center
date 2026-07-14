import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  campaignPriorityScore,
  evaluateCampaignBlockers,
  normalizeCampaigns,
} from "@/lib/campaigns/domain";
import {
  eventProgressSummary,
  normalizeLegendaryEvents,
  normalizeOptionalTimestamp,
} from "@/lib/events/domain";

const fixture = JSON.parse(
  readFileSync("test/fixtures/tacticus/player-state.sanitized.json", "utf8"),
);

describe("campaign and event semantics", () => {
  it("retains every fixture campaign with a collision-safe stable key", () => {
    const campaigns = normalizeCampaigns(fixture.player.progress.campaigns);
    expect(campaigns).toHaveLength(9);
    expect(new Set(campaigns.map((c) => c.externalKey)).size).toBe(9);
    expect(
      campaigns.filter((c) => c.externalCampaignId === "eventCampaign6"),
    ).toHaveLength(2);
    expect(
      campaigns
        .filter((c) => c.externalCampaignId === "eventCampaign6")
        .map((c) => c.normalizedType),
    ).toEqual(["EVENT", "EVENT"]);
    expect(campaigns.reduce((sum, c) => sum + c.battles.length, 0)).toBe(
      fixture.player.progress.campaigns.reduce(
        (sum: number, c: { battles: unknown[] }) => sum + c.battles.length,
        0,
      ),
    );
    expect(campaigns.every((c) => c.semanticStatus !== "VERIFIED")).toBe(true);
  });

  it("normalizes legendary-event counters and lanes without inventing dates", () => {
    const events = normalizeLegendaryEvents(
      fixture.player.progress.legendaryEvents,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      externalEventId: "tauFarsight",
      eventType: "LEGENDARY_EVENT",
      isActive: false,
      startsAt: null,
      endsAt: null,
    });
    expect(eventProgressSummary(events[0])).toMatchObject({
      currentPoints: 1000,
      currentCurrency: 90,
      currentShards: 75,
      currentClaimedChestIndex: 3,
      laneCount: 3,
    });
  });

  it("handles epoch seconds, epoch milliseconds, ISO strings, and invalid timestamps", () => {
    expect(normalizeOptionalTimestamp(1_700_000_000)).toBe(
      "2023-11-14T22:13:20.000Z",
    );
    expect(normalizeOptionalTimestamp(1_700_000_000_000)).toBe(
      "2023-11-14T22:13:20.000Z",
    );
    expect(normalizeOptionalTimestamp("2026-01-02T03:04:05Z")).toBe(
      "2026-01-02T03:04:05.000Z",
    );
    expect(normalizeOptionalTimestamp("not-a-date")).toBeNull();
  });

  it("uses explicit blocker evidence and deterministic priority inputs", () => {
    expect(
      evaluateCampaignBlockers({ manualBlocker: null, team: null }),
    ).toEqual([
      {
        evidence: "INSUFFICIENT_DATA",
        label: "Campaign requirements are not available from the Player API.",
      },
    ]);
    const blockers = evaluateCampaignBlockers({
      manualBlocker: "Need a manual review",
      team: {
        teamMembers: [
          {
            character: {
              name: "Unknown unit",
              isOwned: false,
              upgradeGoals: [],
            },
          },
        ],
      },
    });
    expect(blockers.map((b) => b.evidence)).toEqual(["MANUAL", "EXACT"]);
    expect(
      campaignPriorityScore(
        { priority: "HIGH", status: "ACTIVE", isActive: true, blockerCount: 1 },
        new Date("2026-01-01"),
      ),
    ).toBe(70);
  });
});
