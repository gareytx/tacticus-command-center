import { db } from "@/lib/db";
import {
  campaignPriorityScore,
  evaluateCampaignBlockers,
} from "@/lib/campaigns/domain";

const teamInclude = {
  teamMembers: { include: { character: { include: { upgradeGoals: true } } } },
} as const;

export async function getCampaigns() {
  const campaigns = await db.campaignDefinition.findMany({
    orderBy: [{ normalizedType: "asc" }, { displayName: "asc" }],
    include: {
      progress: true,
      plan: { include: { preferredTeam: { include: teamInclude } } },
    },
  });
  return campaigns.map((campaign) => {
    const blockers = evaluateCampaignBlockers({
      manualBlocker: campaign.plan?.blockerSummary,
      team: campaign.plan?.preferredTeam,
    });
    return {
      ...campaign,
      blockers,
      strategyScore: campaignPriorityScore({
        priority: campaign.plan?.priority,
        status: campaign.plan?.status,
        targetDate: campaign.plan?.targetDate,
        isActive: campaign.isActive,
        blockerCount: blockers.filter((b) => b.evidence !== "INSUFFICIENT_DATA")
          .length,
      }),
    };
  });
}

export async function getCampaign(id: string) {
  const campaign = await db.campaignDefinition.findUnique({
    where: { id },
    include: {
      progress: true,
      plan: {
        include: {
          changes: { orderBy: { createdAt: "desc" }, take: 20 },
          preferredTeam: { include: teamInclude },
        },
      },
      changes: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!campaign) return null;
  return {
    ...campaign,
    blockers: evaluateCampaignBlockers({
      manualBlocker: campaign.plan?.blockerSummary,
      team: campaign.plan?.preferredTeam,
    }),
  };
}

export async function getEvents() {
  return db.eventDefinition.findMany({
    orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
    include: { progress: true, plan: { include: { preferredTeam: true } } },
  });
}

export async function getEvent(id: string) {
  return db.eventDefinition.findUnique({
    where: { id },
    include: {
      progress: true,
      plan: {
        include: {
          changes: { orderBy: { createdAt: "desc" }, take: 20 },
          preferredTeam: { include: teamInclude },
        },
      },
      changes: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
}

export async function getStrategyBrief() {
  const [campaigns, events, readiness] = await Promise.all([
    getCampaigns(),
    getEvents(),
    import("@/services/readiness.service").then((m) => m.getReadinessView()),
  ]);
  const campaignItems = campaigns.map((c) => ({
    id: c.id,
    href: `/campaigns/${c.id}`,
    label: c.displayName,
    kind: "CAMPAIGN",
    score: c.strategyScore,
    reason:
      c.plan?.currentObjective ??
      c.blockers[0]?.label ??
      "Review available upstream progress",
    confidence: c.semanticStatus,
  }));
  const eventItems = events.map((e) => ({
    id: e.id,
    href: `/events/${e.id}`,
    label: e.displayName,
    kind: "EVENT",
    score: campaignPriorityScore({
      priority: e.plan?.priority,
      status: e.plan?.status,
      targetDate: e.plan?.targetDate,
      isActive: e.isActive,
    }),
    reason:
      e.plan?.currentObjective ??
      (e.isActive
        ? "Currently reported event state is available"
        : "Review stored event progress"),
    confidence: e.semanticStatus,
  }));
  return {
    items: [...campaignItems, ...eventItems].sort(
      (a, b) => b.score - a.score || a.label.localeCompare(b.label),
    ),
    readiness: readiness.opportunities.slice(0, 5),
    unknowns: [
      ...campaigns
        .filter((c) => c.semanticStatus === "UNKNOWN")
        .map((c) => c.displayName),
      ...events
        .filter((e) => e.semanticStatus === "UNKNOWN")
        .map((e) => e.displayName),
    ],
  };
}
