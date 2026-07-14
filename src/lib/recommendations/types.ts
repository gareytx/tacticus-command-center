export const RECOMMENDATION_TYPES = [
  "ADVANCE_READY_UNIT",
  "REVIEW_BLOCKED_UNIT",
  "ADVANCE_CAMPAIGN_GOAL",
  "REVIEW_CAMPAIGN_BLOCKER",
  "PREPARE_EVENT_GOAL",
  "REVIEW_EVENT_PROGRESS",
  "PROTECT_SCARCE_RESOURCE",
  "REVIEW_RESOURCE_PRESSURE",
  "COMPLETE_ACTIVE_GOAL",
  "ASSIGN_TEAM",
  "VERIFY_UNKNOWN_UNIT",
  "VERIFY_UNCERTAIN_DATA",
  "REFRESH_STALE_DATA",
  "NO_ACTIONABLE_RECOMMENDATION",
] as const;
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];
export type RecommendationConfidence =
  "EXACT" | "HIGH" | "HEURISTIC" | "MANUAL" | "INSUFFICIENT_DATA";
export type DurationCategory =
  | "QUICK_REVIEW"
  | "SHORT_ACTION"
  | "FOCUSED_SESSION"
  | "LONG_TERM_PLAN"
  | "UNKNOWN_DURATION";
export type Evidence = {
  evidenceType: string;
  sourceEntityType: string;
  sourceEntityId: string | null;
  sourceField: string;
  observedValue: string | number | boolean | null;
  comparisonValue?: string | number | boolean | null;
  sourceTimestamp: string | null;
  confidence: RecommendationConfidence;
  explanation: string;
};
export type RecommendationCandidate = {
  type: RecommendationType;
  advisorSource: string;
  confidence: RecommendationConfidence;
  durationCategory: DurationCategory;
  title: string;
  summary: string;
  explanation: string;
  limitations: string;
  evidence: Evidence[];
  targetEntityType: string | null;
  targetEntityId: string | null;
  targetLabel: string | null;
  strategyPriority?: string | null;
  investmentStatus?: string | null;
  goalPriority?: string | null;
  goalStatus?: string | null;
  deadline?: Date | null;
  readiness?: "EXACT_READY" | "HIGH_READY" | "EXACT_SMALL_GAP" | null;
  staleSource?: boolean;
};
export type AdvisorResult = {
  candidates: RecommendationCandidate[];
  suppressed: number;
  rejected: number;
};
export type RecommendationContext = {
  now: Date;
  lastSuccessfulSyncAt: Date | null;
  sourceSyncRunId: string | null;
  sourceSnapshotId: string | null;
  settings: {
    objectiveEntityType: string | null;
    objectiveEntityId: string | null;
  };
  characters: Array<{
    id: string;
    name: string;
    slug: string;
    priority: string;
    investmentStatus: string;
    unitType: string;
    isOwned: boolean;
    updatedAt: Date;
    lastSyncedAt: Date | null;
    goals: Array<{
      id: string;
      status: string;
      priority: string;
      reason: string | null;
      hasTarget: boolean;
    }>;
    readiness: Array<{
      key: string;
      type: string;
      status: string;
      confidence: string;
      summary: string;
      missing: number | null;
      verification: string;
      verificationNote: string | null;
    }>;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    semanticStatus: string;
    isActive: boolean | null;
    lastSyncedAt: Date;
    plan: null | {
      id: string;
      status: string;
      priority: string;
      objective: string | null;
      blocker: string | null;
      targetDate: Date | null;
      teamId: string | null;
      teamMemberCount: number;
    };
  }>;
  events: Array<{
    id: string;
    name: string;
    semanticStatus: string;
    isActive: boolean | null;
    lastSyncedAt: Date;
    plan: null | {
      id: string;
      status: string;
      priority: string;
      objective: string | null;
      blocker: string | null;
      targetDate: Date | null;
      teamId: string | null;
      teamMemberCount: number;
    };
  }>;
  resources: Array<{
    resourceType: string;
    records: number;
    total: number;
    zero: number;
    low: number;
    confidence: string;
    explanation: string;
  }>;
};
