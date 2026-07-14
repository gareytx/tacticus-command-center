import type { AdvisorResult, RecommendationContext } from "../types";
import { isSourceStale } from "../lifecycle";
export function dataQualityAdvisor(
  context: RecommendationContext,
): AdvisorResult {
  const candidates: AdvisorResult["candidates"] = [];
  if (isSourceStale(context.lastSuccessfulSyncAt, context.now))
    candidates.push({
      type: "REFRESH_STALE_DATA",
      advisorSource: "DATA_QUALITY",
      confidence: "EXACT",
      durationCategory: "QUICK_REVIEW",
      title: "Refresh synchronized account evidence",
      summary:
        "The last successful Player API synchronization is older than the 48-hour freshness threshold.",
      explanation:
        "Freshness is calculated directly from the stored last-success timestamp.",
      limitations:
        "Refreshing updates available account facts; it does not add unsupported game rules.",
      evidence: [
        {
          evidenceType: "DATA_FRESHNESS",
          sourceEntityType: "TACTICUS_CONNECTION",
          sourceEntityId: null,
          sourceField: "lastSuccessfulSyncAt",
          observedValue: context.lastSuccessfulSyncAt?.toISOString() ?? null,
          comparisonValue: "48-hour freshness threshold",
          sourceTimestamp: context.lastSuccessfulSyncAt?.toISOString() ?? null,
          confidence: "EXACT",
          explanation:
            "The stored sync time is beyond the configured freshness threshold.",
        },
      ],
      targetEntityType: "SYNC",
      targetEntityId: "PLAYER",
      targetLabel: "Tacticus player data",
      strategyPriority: "CRITICAL",
    });
  for (const c of context.characters.filter((c) => c.unitType === "UNKNOWN"))
    candidates.push({
      type: "VERIFY_UNKNOWN_UNIT",
      advisorSource: "DATA_QUALITY",
      confidence: "EXACT",
      durationCategory: "QUICK_REVIEW",
      title: `Classify ${c.name}`,
      summary:
        "This owned synchronized unit still has an unknown local unit type.",
      explanation:
        "The unit-type field is explicitly UNKNOWN and can be classified manually.",
      limitations:
        "Classification does not imply mode effectiveness or a global ranking.",
      evidence: [
        {
          evidenceType: "UNKNOWN_CLASSIFICATION",
          sourceEntityType: "CHARACTER",
          sourceEntityId: c.id,
          sourceField: "unitType",
          observedValue: c.unitType,
          sourceTimestamp: c.updatedAt.toISOString(),
          confidence: "EXACT",
          explanation: "The stored unit type is UNKNOWN.",
        },
      ],
      targetEntityType: "CHARACTER",
      targetEntityId: c.id,
      targetLabel: c.name,
      strategyPriority: c.priority,
      investmentStatus: c.investmentStatus,
    });
  for (const c of context.campaigns
    .filter((c) => c.semanticStatus !== "VERIFIED")
    .slice(0, 1))
    candidates.push({
      type: "VERIFY_UNCERTAIN_DATA",
      advisorSource: "DATA_QUALITY",
      confidence: "HEURISTIC",
      durationCategory: "QUICK_REVIEW",
      title: `Review partial campaign semantics for ${c.name}`,
      summary:
        "This campaign record is intentionally partial because completion and stars are unavailable.",
      explanation: "The stored semantic status is not VERIFIED.",
      limitations:
        "Review cannot manufacture campaign completion, rewards, or battle outcomes.",
      evidence: [
        {
          evidenceType: "SEMANTIC_STATUS",
          sourceEntityType: "CAMPAIGN",
          sourceEntityId: c.id,
          sourceField: "semanticStatus",
          observedValue: c.semanticStatus,
          sourceTimestamp: c.lastSyncedAt.toISOString(),
          confidence: "HEURISTIC",
          explanation:
            "The campaign record is explicitly marked partial or unknown.",
        },
      ],
      targetEntityType: "CAMPAIGN",
      targetEntityId: c.id,
      targetLabel: c.name,
      strategyPriority: c.plan?.priority ?? "LOW",
    });
  for (const e of context.events
    .filter((e) => e.semanticStatus !== "VERIFIED")
    .slice(0, 1))
    candidates.push({
      type: "VERIFY_UNCERTAIN_DATA",
      advisorSource: "DATA_QUALITY",
      confidence: "HEURISTIC",
      durationCategory: "QUICK_REVIEW",
      title: `Review partial event semantics for ${e.name}`,
      summary: "This event record lacks some rule and schedule fields.",
      explanation: "The stored event semantic status is not VERIFIED.",
      limitations:
        "Dates, eligibility, rewards, and final outcomes remain unknown.",
      evidence: [
        {
          evidenceType: "SEMANTIC_STATUS",
          sourceEntityType: "EVENT",
          sourceEntityId: e.id,
          sourceField: "semanticStatus",
          observedValue: e.semanticStatus,
          sourceTimestamp: e.lastSyncedAt.toISOString(),
          confidence: "HEURISTIC",
          explanation:
            "The event record is explicitly marked partial or unknown.",
        },
      ],
      targetEntityType: "EVENT",
      targetEntityId: e.id,
      targetLabel: e.name,
      strategyPriority: e.plan?.priority ?? "LOW",
    });
  return { candidates, suppressed: 0, rejected: 0 };
}
