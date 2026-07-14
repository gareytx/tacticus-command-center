import type { AdvisorResult, RecommendationContext } from "../types";
import { CAMPAIGN_LIMITATION } from "../explanations";
export function campaignAdvisor(context: RecommendationContext): AdvisorResult {
  const candidates: AdvisorResult["candidates"] = [];
  for (const c of context.campaigns) {
    const p = c.plan;
    if (!p) continue;
    const base = {
      sourceEntityType: "CAMPAIGN",
      sourceEntityId: c.id,
      sourceTimestamp: c.lastSyncedAt.toISOString(),
    };
    const priority = {
      evidenceType: "CAMPAIGN_PLAN",
      ...base,
      sourceField: "plan.priority",
      observedValue: p.priority,
      confidence: "MANUAL" as const,
      explanation: "This is the saved campaign priority.",
    };
    if (p.blocker)
      candidates.push({
        type: "REVIEW_CAMPAIGN_BLOCKER",
        advisorSource: "CAMPAIGN",
        confidence: "MANUAL",
        durationCategory: "QUICK_REVIEW",
        title: `Review the blocker for ${c.name}`,
        summary: p.blocker,
        explanation:
          "A user-entered blocker is attached to this campaign plan.",
        limitations: CAMPAIGN_LIMITATION,
        evidence: [
          priority,
          {
            evidenceType: "MANUAL_BLOCKER",
            ...base,
            sourceField: "plan.blocker",
            observedValue: p.blocker,
            confidence: "MANUAL",
            explanation: "This blocker was entered locally.",
          },
        ],
        targetEntityType: "CAMPAIGN",
        targetEntityId: c.id,
        targetLabel: c.name,
        strategyPriority: p.priority,
        deadline: p.targetDate,
      });
    if (["CRITICAL", "HIGH"].includes(p.priority) && p.objective)
      candidates.push({
        type: "ADVANCE_CAMPAIGN_GOAL",
        advisorSource: "CAMPAIGN",
        confidence: "MANUAL",
        durationCategory: "FOCUSED_SESSION",
        title: `Advance the saved objective for ${c.name}`,
        summary: p.objective,
        explanation:
          "The recommendation reflects an explicit high-priority local campaign objective.",
        limitations: CAMPAIGN_LIMITATION,
        evidence: [
          priority,
          {
            evidenceType: "LOCAL_OBJECTIVE",
            ...base,
            sourceField: "plan.objective",
            observedValue: p.objective,
            confidence: "MANUAL",
            explanation: "This objective was entered locally.",
          },
        ],
        targetEntityType: "CAMPAIGN",
        targetEntityId: c.id,
        targetLabel: c.name,
        strategyPriority: p.priority,
        deadline: p.targetDate,
      });
    if (
      ["CRITICAL", "HIGH"].includes(p.priority) &&
      (!p.teamId || p.teamMemberCount === 0)
    )
      candidates.push({
        type: "ASSIGN_TEAM",
        advisorSource: "CAMPAIGN",
        confidence: "HIGH",
        durationCategory: "QUICK_REVIEW",
        title: `Assign a team to ${c.name}`,
        summary:
          "This high-priority campaign plan has no populated preferred team.",
        explanation:
          "Team assignment is incomplete for an explicitly prioritized local plan.",
        limitations:
          "Assignment supports planning only; it does not establish eligibility or battle success.",
        evidence: [
          priority,
          {
            evidenceType: "TEAM_ASSIGNMENT",
            ...base,
            sourceField: "plan.teamMemberCount",
            observedValue: p.teamMemberCount,
            comparisonValue: 1,
            confidence: "EXACT",
            explanation: "The preferred team is absent or contains no members.",
          },
        ],
        targetEntityType: "CAMPAIGN",
        targetEntityId: c.id,
        targetLabel: c.name,
        strategyPriority: p.priority,
        deadline: p.targetDate,
      });
  }
  return { candidates, suppressed: 0, rejected: 0 };
}
