import type { AdvisorResult, RecommendationContext } from "../types";
export function goalAdvisor(context: RecommendationContext): AdvisorResult {
  const candidates: AdvisorResult["candidates"] = [];
  let suppressed = 0;
  for (const c of context.characters) {
    for (const g of c.goals) {
      if (["COMPLETED", "CANCELLED"].includes(g.status)) {
        suppressed++;
        continue;
      }
      if (c.investmentStatus === "IGNORE_FOR_NOW") {
        suppressed++;
        continue;
      }
      if (["CRITICAL", "HIGH"].includes(g.priority) || g.status === "BLOCKED")
        candidates.push({
          type: "COMPLETE_ACTIVE_GOAL",
          advisorSource: "GOAL",
          confidence: "MANUAL",
          durationCategory: "LONG_TERM_PLAN",
          title:
            g.status === "BLOCKED"
              ? `Resolve ${c.name}'s blocked goal`
              : `Continue ${c.name}'s active goal`,
          summary: g.reason ?? "Review the saved goal and its next local step.",
          explanation:
            "This recommendation comes from an active user-created upgrade goal.",
          limitations:
            "The goal is local strategy. Upgrade recipes, farming locations, energy, and exact costs are not inferred.",
          evidence: [
            {
              evidenceType: "UPGRADE_GOAL",
              sourceEntityType: "UPGRADE_GOAL",
              sourceEntityId: g.id,
              sourceField: "status",
              observedValue: g.status,
              sourceTimestamp: c.updatedAt.toISOString(),
              confidence: "MANUAL",
              explanation: "This is the saved local goal status.",
            },
            {
              evidenceType: "GOAL_PRIORITY",
              sourceEntityType: "UPGRADE_GOAL",
              sourceEntityId: g.id,
              sourceField: "priority",
              observedValue: g.priority,
              sourceTimestamp: c.updatedAt.toISOString(),
              confidence: "MANUAL",
              explanation: "This is the saved local goal priority.",
            },
          ],
          targetEntityType: "UPGRADE_GOAL",
          targetEntityId: g.id,
          targetLabel: c.name,
          strategyPriority: c.priority,
          investmentStatus: c.investmentStatus,
          goalPriority: g.priority,
          goalStatus: g.status,
        });
    }
  }
  return { candidates, suppressed, rejected: 0 };
}
