import { db } from "@/lib/db";
import { evaluateReadiness } from "@/lib/readiness/readiness-engine";
import { analyzeBottlenecks } from "@/lib/readiness/bottleneck-analysis";
import { generateRecommendations } from "@/lib/recommendations/engine";
import {
  lifecycleKey,
  fingerprintCandidate,
} from "@/lib/recommendations/deduplication";
import {
  REVIEW_HORIZON_MS,
  snoozeUntil,
} from "@/lib/recommendations/lifecycle";
import { recommendationActionSchema } from "@/lib/recommendations/schemas";
import type { RecommendationContext } from "@/lib/recommendations/types";

export async function buildRecommendationContext(
  now = new Date(),
): Promise<RecommendationContext> {
  const [
    characters,
    inventory,
    campaigns,
    events,
    connection,
    settings,
    verifications,
    latestRun,
    latestSnapshot,
  ] = await Promise.all([
    db.character.findMany({
      where: { isOwned: true },
      include: { upgradeGoals: true },
    }),
    db.inventoryItem.findMany(),
    db.campaignDefinition.findMany({
      include: {
        plan: {
          include: { preferredTeam: { include: { teamMembers: true } } },
        },
      },
    }),
    db.eventDefinition.findMany({
      include: {
        plan: {
          include: { preferredTeam: { include: { teamMembers: true } } },
        },
      },
    }),
    db.tacticusConnection.findFirst(),
    db.strategicSettings.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    }),
    db.readinessVerification.findMany(),
    db.tacticusSyncRun.findFirst({
      where: { status: "SUCCEEDED" },
      orderBy: { completedAt: "desc" },
    }),
    db.rosterSnapshot.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);
  return {
    now,
    lastSuccessfulSyncAt: connection?.lastSuccessfulSyncAt ?? null,
    sourceSyncRunId: latestRun?.id ?? null,
    sourceSnapshotId: latestSnapshot?.id ?? null,
    settings: {
      objectiveEntityType: settings.objectiveEntityType,
      objectiveEntityId: settings.objectiveEntityId,
    },
    characters: characters.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      priority: c.priority,
      investmentStatus: c.investmentStatus,
      unitType: c.unitType,
      isOwned: c.isOwned,
      updatedAt: c.updatedAt,
      lastSyncedAt: c.lastSyncedAt,
      goals: c.upgradeGoals.map((g) => ({
        id: g.id,
        status: g.status,
        priority: g.priority,
        reason: g.reason,
        hasTarget: Boolean(
          g.targetRank ||
          g.targetRarity ||
          g.targetCharacterLevel ||
          g.targetActiveAbilityLevel ||
          g.targetPassiveAbilityLevel,
        ),
      })),
      readiness: evaluateReadiness({
        ...c,
        activeGoal: c.upgradeGoals.some(
          (g) => !["COMPLETED", "CANCELLED"].includes(g.status),
        ),
      }).map((r) => ({
        key: r.key,
        type: r.type,
        status: r.status,
        confidence: r.confidence,
        summary: r.summary,
        missing: r.missing,
        verification:
          verifications.find((v) => v.key === r.key)?.status ?? "NEEDS_REVIEW",
        verificationNote:
          verifications.find((v) => v.key === r.key)?.note ?? null,
      })),
    })),
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.displayName,
      semanticStatus: c.semanticStatus,
      isActive: c.isActive,
      lastSyncedAt: c.lastSyncedAt,
      plan: c.plan
        ? {
            id: c.plan.id,
            status: c.plan.status,
            priority: c.plan.priority,
            objective: c.plan.currentObjective ?? c.plan.targetObjective,
            blocker: c.plan.blockerSummary,
            targetDate: c.plan.targetDate,
            teamId: c.plan.preferredTeamId,
            teamMemberCount: c.plan.preferredTeam?.teamMembers.length ?? 0,
          }
        : null,
    })),
    events: events.map((e) => ({
      id: e.id,
      name: e.displayName,
      semanticStatus: e.semanticStatus,
      isActive: e.isActive,
      lastSyncedAt: e.lastSyncedAt,
      plan: e.plan
        ? {
            id: e.plan.id,
            status: e.plan.status,
            priority: e.plan.priority,
            objective: e.plan.currentObjective ?? e.plan.targetObjective,
            blocker: e.plan.blockerSummary,
            targetDate: e.plan.targetDate,
            teamId: e.plan.preferredTeamId,
            teamMemberCount: e.plan.preferredTeam?.teamMembers.length ?? 0,
          }
        : null,
    })),
    resources: analyzeBottlenecks(inventory),
  };
}

export async function regenerateRecommendations(options: { now?: Date } = {}) {
  const now = options.now ?? new Date();
  const context = await buildRecommendationContext(now);
  const generated = generateRecommendations(context);
  const fingerprints = new Set(generated.candidates.map(fingerprintCandidate));
  let created = 0,
    updated = 0,
    superseded = 0,
    stale = 0;
  await db.$transaction(async (tx) => {
    for (const candidate of generated.candidates) {
      const fingerprint = fingerprintCandidate(candidate);
      const key = lifecycleKey(candidate);
      const existing = await tx.recommendation.findUnique({
        where: { fingerprint },
      });
      const data = {
        type: candidate.type,
        advisorSource: candidate.advisorSource,
        confidence: candidate.confidence,
        priorityScore: candidate.priorityScore,
        durationCategory: candidate.durationCategory,
        title: candidate.title,
        summary: candidate.summary,
        explanation: candidate.explanation,
        limitations: candidate.limitations,
        evidenceJson: JSON.stringify(candidate.evidence),
        targetEntityType: candidate.targetEntityType,
        targetEntityId: candidate.targetEntityId,
        targetLabel: candidate.targetLabel,
        lifecycleKey: key,
        sourceSyncRunId: context.sourceSyncRunId,
        sourceSnapshotId: context.sourceSnapshotId,
        generatedAt: now,
        expiresAt: new Date(now.getTime() + REVIEW_HORIZON_MS),
        staleAt: new Date(now.getTime() + REVIEW_HORIZON_MS),
      };
      if (existing) {
        await tx.recommendation.update({
          where: { id: existing.id },
          data: {
            ...data,
            status:
              existing.status === "SNOOZED" &&
              existing.snoozedUntil &&
              existing.snoozedUntil <= now
                ? "ACTIVE"
                : existing.status,
          },
        });
        updated++;
      } else {
        const old = await tx.recommendation.findMany({
          where: {
            lifecycleKey: key,
            status: { in: ["ACTIVE", "SNOOZED", "DISMISSED", "COMPLETED"] },
          },
        });
        for (const item of old) {
          await tx.recommendation.update({
            where: { id: item.id },
            data: { status: "SUPERSEDED", supersededAt: now },
          });
          superseded++;
        }
        await tx.recommendation.create({
          data: { ...data, fingerprint, status: "ACTIVE" },
        });
        created++;
      }
    }
    const obsolete = await tx.recommendation.findMany({
      where: { status: { in: ["ACTIVE", "SNOOZED"] } },
    });
    for (const item of obsolete)
      if (!fingerprints.has(item.fingerprint)) {
        await tx.recommendation.update({
          where: { id: item.id },
          data: { status: "STALE", staleAt: now },
        });
        stale++;
      }
    await tx.strategicSettings.update({
      where: { id: "default" },
      data: { lastRecommendationRunAt: now },
    });
  });
  return {
    ...generated,
    created,
    updated,
    superseded,
    stale,
    activeCount: await db.recommendation.count({ where: { status: "ACTIVE" } }),
  };
}

export async function listRecommendations() {
  return db.recommendation.findMany({
    orderBy: [{ priorityScore: "desc" }, { generatedAt: "desc" }],
    include: { feedback: { orderBy: { createdAt: "desc" } } },
  });
}
export async function getRecommendation(id: string) {
  return db.recommendation.findUnique({
    where: { id },
    include: { feedback: { orderBy: { createdAt: "desc" } } },
  });
}
export async function applyRecommendationAction(
  input: unknown,
  now = new Date(),
) {
  const value = recommendationActionSchema.parse(input);
  const data =
    value.action === "COMPLETE"
      ? { status: "COMPLETED" as const, completedAt: now }
      : value.action === "DISMISS"
        ? { status: "DISMISSED" as const, dismissedAt: now }
        : value.action.startsWith("SNOOZE_")
          ? {
              status: "SNOOZED" as const,
              snoozedUntil: snoozeUntil(value.action, now),
            }
          : {
              status: "ACTIVE" as const,
              dismissedAt: null,
              snoozedUntil: null,
              completedAt: null,
            };
  return db.recommendation.update({
    where: { id: value.recommendationId },
    data,
  });
}
