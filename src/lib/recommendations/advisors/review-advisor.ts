import type { AdvisorResult, RecommendationContext } from "../types";
export function reviewAdvisor(context: RecommendationContext): AdvisorResult {
  const candidates: AdvisorResult["candidates"] = [];
  for (const c of context.campaigns) {
    if (
      c.plan &&
      !c.plan.objective &&
      ["CRITICAL", "HIGH"].includes(c.plan.priority)
    )
      candidates.push({
        type: "VERIFY_UNCERTAIN_DATA",
        advisorSource: "REVIEW",
        confidence: "MANUAL",
        durationCategory: "QUICK_REVIEW",
        title: `Set an objective for ${c.name}`,
        summary:
          "This prioritized local campaign plan has no current objective.",
        explanation: "The missing objective is a local planning gap.",
        limitations:
          "An objective is user-owned strategy; no game requirement is inferred.",
        evidence: [
          {
            evidenceType: "INCOMPLETE_PLAN",
            sourceEntityType: "CAMPAIGN",
            sourceEntityId: c.id,
            sourceField: "plan.objective",
            observedValue: null,
            sourceTimestamp: c.lastSyncedAt.toISOString(),
            confidence: "MANUAL",
            explanation: "The saved campaign objective is empty.",
          },
        ],
        targetEntityType: "CAMPAIGN",
        targetEntityId: c.id,
        targetLabel: c.name,
        strategyPriority: c.plan.priority,
      });
  }
  return { candidates, suppressed: 0, rejected: 0 };
}
