import type { RecommendationCandidate, RecommendationContext } from "./types";
import { candidateSchema } from "./schemas";
import { validateEvidenceCandidate } from "./evidence";
import { deduplicateCandidates, fingerprintCandidate } from "./deduplication";
import { scoreRecommendation } from "./scoring";
import { CONFIDENCE_ORDER } from "./confidence";
import { isSourceStale } from "./lifecycle";
import { readinessAdvisor } from "./advisors/readiness-advisor";
import { campaignAdvisor } from "./advisors/campaign-advisor";
import { eventAdvisor } from "./advisors/event-advisor";
import { resourceAdvisor } from "./advisors/resource-advisor";
import { goalAdvisor } from "./advisors/goal-advisor";
import { dataQualityAdvisor } from "./advisors/data-quality-advisor";
import { reviewAdvisor } from "./advisors/review-advisor";

export type ScoredCandidate = RecommendationCandidate & {
  priorityScore: number;
  fingerprint: string;
};
export function generateRecommendations(context: RecommendationContext) {
  const results = [
    readinessAdvisor(context),
    campaignAdvisor(context),
    eventAdvisor(context),
    resourceAdvisor(context),
    goalAdvisor(context),
    dataQualityAdvisor(context),
    reviewAdvisor(context),
  ];
  const advisorCounts: Record<string, number> = {};
  let rejected = results.reduce((s, r) => s + r.rejected, 0);
  let suppressed = results.reduce((s, r) => s + r.suppressed, 0);
  const validated: RecommendationCandidate[] = [];
  const stale = isSourceStale(context.lastSuccessfulSyncAt, context.now);
  for (const result of results)
    for (const raw of result.candidates) {
      try {
        const c = candidateSchema.parse(raw);
        validateEvidenceCandidate(c);
        if (
          stale &&
          ["READINESS", "RESOURCE", "EVENT"].includes(c.advisorSource)
        ) {
          suppressed++;
          continue;
        }
        validated.push(c);
        advisorCounts[c.advisorSource] =
          (advisorCounts[c.advisorSource] ?? 0) + 1;
      } catch {
        rejected++;
      }
    }
  const candidates: ScoredCandidate[] = deduplicateCandidates(validated)
    .map((c) => ({
      ...c,
      priorityScore: scoreRecommendation(c, context.now, {
        entityType: context.settings.objectiveEntityType,
        entityId: context.settings.objectiveEntityId,
      }),
      fingerprint: fingerprintCandidate(c),
    }))
    .filter((c) => c.confidence !== "INSUFFICIENT_DATA")
    .sort(
      (a, b) =>
        b.priorityScore - a.priorityScore ||
        CONFIDENCE_ORDER[b.confidence] - CONFIDENCE_ORDER[a.confidence] ||
        a.type.localeCompare(b.type) ||
        (a.targetEntityType ?? "").localeCompare(b.targetEntityType ?? "") ||
        (a.targetEntityId ?? "").localeCompare(b.targetEntityId ?? "") ||
        a.fingerprint.localeCompare(b.fingerprint),
    );
  return { candidates, advisorCounts, suppressed, rejected };
}
