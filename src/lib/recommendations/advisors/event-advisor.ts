import type { AdvisorResult, RecommendationContext } from "../types";
import { EVENT_LIMITATION } from "../explanations";
export function eventAdvisor(context: RecommendationContext): AdvisorResult {
  const candidates: AdvisorResult["candidates"] = [];
  for (const e of context.events) {
    const p = e.plan;
    if (!p && e.isActive !== true) continue;
    const priority = p?.priority ?? "MEDIUM";
    const evidence = [
      {
        evidenceType: "EVENT_STATE",
        sourceEntityType: "EVENT",
        sourceEntityId: e.id,
        sourceField: "isActive",
        observedValue: e.isActive,
        sourceTimestamp: e.lastSyncedAt.toISOString(),
        confidence: "EXACT" as const,
        explanation: "This is the currently reported event-state flag.",
      },
    ];
    if (e.isActive === true || p?.objective)
      candidates.push({
        type: p?.objective ? "PREPARE_EVENT_GOAL" : "REVIEW_EVENT_PROGRESS",
        advisorSource: "EVENT",
        confidence: p?.objective ? "MANUAL" : "EXACT",
        durationCategory: "FOCUSED_SESSION",
        title: p?.objective
          ? `Prepare the saved goal for ${e.name}`
          : `Review current progress for ${e.name}`,
        summary:
          p?.objective ??
          "The API currently reports active event state for this record.",
        explanation: p?.objective
          ? "This action is based on an explicit local event objective."
          : "A current event-state record is available for review.",
        limitations: EVENT_LIMITATION,
        evidence: [
          ...evidence,
          ...(p?.objective
            ? [
                {
                  evidenceType: "LOCAL_OBJECTIVE",
                  sourceEntityType: "EVENT",
                  sourceEntityId: e.id,
                  sourceField: "plan.objective",
                  observedValue: p.objective,
                  sourceTimestamp: e.lastSyncedAt.toISOString(),
                  confidence: "MANUAL" as const,
                  explanation: "This objective was entered locally.",
                },
              ]
            : []),
        ],
        targetEntityType: "EVENT",
        targetEntityId: e.id,
        targetLabel: e.name,
        strategyPriority: priority,
        deadline: p?.targetDate,
      });
    if (
      p &&
      ["CRITICAL", "HIGH"].includes(p.priority) &&
      (!p.teamId || p.teamMemberCount === 0)
    )
      candidates.push({
        type: "ASSIGN_TEAM",
        advisorSource: "EVENT",
        confidence: "HIGH",
        durationCategory: "QUICK_REVIEW",
        title: `Assign a team to ${e.name}`,
        summary: "This prioritized event plan has no populated preferred team.",
        explanation:
          "The local event plan is prioritized but its team assignment is incomplete.",
        limitations: EVENT_LIMITATION,
        evidence: [
          {
            evidenceType: "TEAM_ASSIGNMENT",
            sourceEntityType: "EVENT",
            sourceEntityId: e.id,
            sourceField: "plan.teamMemberCount",
            observedValue: p.teamMemberCount,
            comparisonValue: 1,
            sourceTimestamp: e.lastSyncedAt.toISOString(),
            confidence: "EXACT",
            explanation: "The preferred team is absent or contains no members.",
          },
        ],
        targetEntityType: "EVENT",
        targetEntityId: e.id,
        targetLabel: e.name,
        strategyPriority: p.priority,
        deadline: p.targetDate,
      });
  }
  return { candidates, suppressed: 0, rejected: 0 };
}
