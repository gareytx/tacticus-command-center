import type { AdvisorResult, RecommendationContext } from "../types";
import { RESOURCE_LIMITATION } from "../explanations";
export function resourceAdvisor(context: RecommendationContext): AdvisorResult {
  const candidates = context.resources
    .filter((r) => r.zero > 0 || r.low > 0)
    .slice(0, 3)
    .map((r) => ({
      type: "REVIEW_RESOURCE_PRESSURE" as const,
      advisorSource: "RESOURCE",
      confidence: "HEURISTIC" as const,
      durationCategory: "QUICK_REVIEW" as const,
      title: `Review ${r.resourceType.replaceAll("_", " ").toLowerCase()} pressure`,
      summary: `${r.zero} empty and ${r.low} low-quantity records are visible in this category.`,
      explanation: r.explanation,
      limitations: RESOURCE_LIMITATION,
      evidence: [
        {
          evidenceType: "RESOURCE_PRESSURE",
          sourceEntityType: "RESOURCE_CATEGORY",
          sourceEntityId: r.resourceType,
          sourceField: "zeroAndLowRecords",
          observedValue: r.zero + r.low,
          comparisonValue: r.records,
          sourceTimestamp: context.lastSuccessfulSyncAt?.toISOString() ?? null,
          confidence: "HEURISTIC" as const,
          explanation: RESOURCE_LIMITATION,
        },
      ],
      targetEntityType: "RESOURCE_CATEGORY",
      targetEntityId: r.resourceType,
      targetLabel: r.resourceType,
      strategyPriority: "LOW",
    }));
  return { candidates, suppressed: 0, rejected: 0 };
}
