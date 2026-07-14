import type { RecommendationCandidate } from "./types";
const BASE: Record<string, number> = {
  CRITICAL: 500,
  HIGH: 400,
  MEDIUM: 300,
  LOW: 200,
  HOLD: 50,
  NONE: 100,
};
const INVESTMENT: Record<string, number> = {
  INVEST_NOW: 120,
  CAMPAIGN_PRIORITY: 100,
  EVENT_PRIORITY: 90,
  GUILD_RAID_PRIORITY: 70,
  ARENA_PRIORITY: 60,
  MAINTAIN: 10,
  IGNORE_FOR_NOW: -250,
};
const CONFIDENCE: Record<string, number> = {
  EXACT: 100,
  HIGH: 70,
  MANUAL: 60,
  HEURISTIC: 20,
};
export function deadlineScore(deadline: Date | null | undefined, now: Date) {
  if (!deadline) return 0;
  const hours = (deadline.getTime() - now.getTime()) / 3_600_000;
  if (hours <= 24) return 150;
  if (hours <= 72) return 100;
  if (hours <= 168) return 50;
  return 0;
}
export function scoreRecommendation(
  candidate: RecommendationCandidate,
  now: Date,
  objective?: { entityType: string | null; entityId: string | null },
) {
  if (candidate.confidence === "INSUFFICIENT_DATA") return 0;
  let score =
    (BASE[candidate.strategyPriority ?? "NONE"] ?? 100) +
    (INVESTMENT[candidate.investmentStatus ?? ""] ?? 0) +
    (CONFIDENCE[candidate.confidence] ?? 0);
  if (candidate.goalStatus === "BLOCKED") score += 50;
  else if (
    candidate.goalStatus &&
    !["COMPLETED", "CANCELLED"].includes(candidate.goalStatus)
  )
    score +=
      candidate.goalPriority === "CRITICAL"
        ? 100
        : candidate.goalPriority === "HIGH"
          ? 75
          : 0;
  score += deadlineScore(candidate.deadline, now);
  if (candidate.readiness === "EXACT_READY") score += 120;
  else if (candidate.readiness === "HIGH_READY") score += 90;
  else if (candidate.readiness === "EXACT_SMALL_GAP") score += 70;
  if (candidate.staleSource) score -= 200;
  if (
    objective?.entityType === candidate.targetEntityType &&
    objective.entityId === candidate.targetEntityId
  )
    score += 40;
  return Math.max(0, Math.min(1000, score));
}
