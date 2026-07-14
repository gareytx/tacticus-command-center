import type { AdvisorResult, RecommendationContext } from "../types";
import { CAMPAIGN_LIMITATION } from "../explanations";
export function readinessAdvisor(
  context: RecommendationContext,
): AdvisorResult {
  const candidates: AdvisorResult["candidates"] = [];
  let suppressed = 0;
  for (const c of context.characters) {
    if (c.investmentStatus === "IGNORE_FOR_NOW") {
      suppressed++;
      continue;
    }
    for (const r of c.readiness) {
      if (r.type !== "SHARD") continue;
      const evidence = [
        {
          evidenceType: "READINESS_RESULT",
          sourceEntityType: "CHARACTER",
          sourceEntityId: c.id,
          sourceField: "readiness.status",
          observedValue: r.status,
          comparisonValue: r.missing,
          sourceTimestamp: c.lastSyncedAt?.toISOString() ?? null,
          confidence:
            r.confidence === "EXACT"
              ? ("EXACT" as const)
              : ("INSUFFICIENT_DATA" as const),
          explanation: r.summary,
        },
        {
          evidenceType: "LOCAL_PRIORITY",
          sourceEntityType: "CHARACTER",
          sourceEntityId: c.id,
          sourceField: "priority",
          observedValue: c.priority,
          sourceTimestamp: c.updatedAt.toISOString(),
          confidence: "MANUAL" as const,
          explanation: "This is the saved local character priority.",
        },
      ];
      if (r.status === "READY" && r.confidence === "EXACT")
        candidates.push({
          type: "ADVANCE_READY_UNIT",
          advisorSource: "READINESS",
          confidence: "EXACT",
          durationCategory: "SHORT_ACTION",
          title: `Review the ready threshold for ${c.name}`,
          summary:
            "The verified local shard threshold is met; decide whether to advance this saved objective.",
          explanation: `${r.summary} The action remains your decision.`,
          limitations:
            "This verifies only the saved local shard threshold; it does not assert rank-up costs, recipes, or mode effectiveness.",
          evidence,
          targetEntityType: "CHARACTER",
          targetEntityId: c.id,
          targetLabel: c.name,
          strategyPriority: c.priority,
          investmentStatus: c.investmentStatus,
          readiness: "EXACT_READY",
        });
      else if (
        r.status === "BLOCKED" &&
        r.confidence === "EXACT" &&
        ["CRITICAL", "HIGH"].includes(c.priority)
      )
        candidates.push({
          type: "REVIEW_BLOCKED_UNIT",
          advisorSource: "READINESS",
          confidence: "EXACT",
          durationCategory: "QUICK_REVIEW",
          title: `Review ${c.name}'s verified shard gap`,
          summary: r.summary,
          explanation:
            "A high local priority and an exact saved shard gap make this worth reviewing.",
          limitations: CAMPAIGN_LIMITATION,
          evidence,
          targetEntityType: "CHARACTER",
          targetEntityId: c.id,
          targetLabel: c.name,
          strategyPriority: c.priority,
          investmentStatus: c.investmentStatus,
          readiness: (r.missing ?? 999) <= 20 ? "EXACT_SMALL_GAP" : null,
        });
    }
  }
  return { candidates, suppressed, rejected: 0 };
}
