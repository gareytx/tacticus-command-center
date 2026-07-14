import { describe, expect, it } from "vitest";
import {
  scoreRecommendation,
  deadlineScore,
} from "@/lib/recommendations/scoring";
import {
  fingerprintCandidate,
  deduplicateCandidates,
} from "@/lib/recommendations/deduplication";
import { validateEvidenceCandidate } from "@/lib/recommendations/evidence";
import {
  snoozeUntil,
  visibleForBudget,
  isSourceStale,
} from "@/lib/recommendations/lifecycle";
import { generateRecommendations } from "@/lib/recommendations/engine";
import type {
  RecommendationCandidate,
  RecommendationContext,
} from "@/lib/recommendations/types";

const now = new Date("2026-07-14T12:00:00Z");
const evidence = {
  evidenceType: "LOCAL_PRIORITY",
  sourceEntityType: "CHARACTER",
  sourceEntityId: "c1",
  sourceField: "priority",
  observedValue: "HIGH",
  sourceTimestamp: now.toISOString(),
  confidence: "MANUAL" as const,
  explanation: "Saved local priority.",
};
const candidate: RecommendationCandidate = {
  type: "ADVANCE_READY_UNIT",
  advisorSource: "READINESS",
  confidence: "EXACT",
  durationCategory: "SHORT_ACTION",
  title: "Review ready threshold",
  summary: "The local threshold is met.",
  explanation: "Deterministic local evidence.",
  limitations: "No costs or outcomes are inferred.",
  evidence: [evidence],
  targetEntityType: "CHARACTER",
  targetEntityId: "c1",
  targetLabel: "Unit",
  strategyPriority: "HIGH",
  investmentStatus: "INVEST_NOW",
  readiness: "EXACT_READY",
};
const context = (
  overrides: Partial<RecommendationContext> = {},
): RecommendationContext => ({
  now,
  lastSuccessfulSyncAt: now,
  sourceSyncRunId: "run",
  sourceSnapshotId: "snap",
  settings: { objectiveEntityType: null, objectiveEntityId: null },
  characters: [],
  campaigns: [],
  events: [],
  resources: [],
  ...overrides,
});

describe("recommendation engine", () => {
  it("scores documented components and objective influence", () => {
    expect(scoreRecommendation(candidate, now)).toBe(740);
    expect(
      scoreRecommendation(candidate, now, {
        entityType: "CHARACTER",
        entityId: "c1",
      }),
    ).toBe(780);
  });
  it("applies exact deadlines but no missing-deadline score", () => {
    expect(deadlineScore(null, now)).toBe(0);
    expect(deadlineScore(new Date(now.getTime() + 20 * 3_600_000), now)).toBe(
      150,
    );
    expect(deadlineScore(new Date(now.getTime() + 48 * 3_600_000), now)).toBe(
      100,
    );
    expect(deadlineScore(new Date(now.getTime() + 6 * 86_400_000), now)).toBe(
      50,
    );
  });
  it("uses deterministic fingerprints and deduplication", () => {
    expect(fingerprintCandidate(candidate)).toBe(
      fingerprintCandidate({ ...candidate }),
    );
    expect(deduplicateCandidates([candidate, { ...candidate }])).toHaveLength(
      1,
    );
    expect(
      fingerprintCandidate({ ...candidate, strategyPriority: "CRITICAL" }),
    ).not.toBe(fingerprintCandidate(candidate));
  });
  it("rejects candidates without evidence", () => {
    expect(() =>
      validateEvidenceCandidate({ ...candidate, evidence: [] }),
    ).toThrow("required");
  });
  it("rejects sensitive evidence fields", () => {
    expect(() =>
      validateEvidenceCandidate({
        ...candidate,
        evidence: [{ ...evidence, sourceField: "authorizationHeader" }],
      }),
    ).toThrow("Sensitive");
  });
  it("rejects insufficient-data positive actions", () => {
    expect(() =>
      validateEvidenceCandidate({
        ...candidate,
        confidence: "INSUFFICIENT_DATA",
      }),
    ).toThrow("Insufficient");
  });
  it("rejects unsupported claims", () => {
    expect(() =>
      validateEvidenceCandidate({
        ...candidate,
        summary: "Choose a farming node now.",
      }),
    ).toThrow("Unsupported");
  });
  it("categorizes time budgets without claiming duration", () => {
    expect(visibleForBudget("QUICK_REVIEW", 10)).toBe(true);
    expect(visibleForBudget("SHORT_ACTION", 10)).toBe(false);
    expect(visibleForBudget("FOCUSED_SESSION", 30)).toBe(true);
    expect(visibleForBudget("LONG_TERM_PLAN", 45)).toBe(false);
    expect(visibleForBudget("LONG_TERM_PLAN", 60)).toBe(true);
  });
  it("calculates snooze deadlines and staleness", () => {
    expect(snoozeUntil("SNOOZE_3_DAYS", now).getTime()).toBe(
      now.getTime() + 3 * 86_400_000,
    );
    expect(isSourceStale(new Date(now.getTime() - 49 * 3_600_000), now)).toBe(
      true,
    );
  });
  it("emits exact readiness and suppresses ignored units", () => {
    const character = {
      id: "c1",
      name: "Unit",
      slug: "unit",
      priority: "HIGH",
      investmentStatus: "INVEST_NOW",
      unitType: "CHARACTER",
      isOwned: true,
      updatedAt: now,
      lastSyncedAt: now,
      goals: [],
      readiness: [
        {
          key: "c1:SHARD",
          type: "SHARD",
          status: "READY",
          confidence: "EXACT",
          summary: "Threshold met",
          missing: 0,
          verification: "VERIFIED",
          verificationNote: null,
        },
      ],
    };
    expect(
      generateRecommendations(
        context({ characters: [character] }),
      ).candidates.some((c) => c.type === "ADVANCE_READY_UNIT"),
    ).toBe(true);
    const ignored = { ...character, investmentStatus: "IGNORE_FOR_NOW" };
    const result = generateRecommendations(context({ characters: [ignored] }));
    expect(result.candidates.some((c) => c.type === "ADVANCE_READY_UNIT")).toBe(
      false,
    );
    expect(result.suppressed).toBeGreaterThan(0);
  });
  it("suppresses completed goals and emits active critical goals", () => {
    const base = {
      id: "c1",
      name: "Unit",
      slug: "unit",
      priority: "HIGH",
      investmentStatus: "INVEST_NOW",
      unitType: "CHARACTER",
      isOwned: true,
      updatedAt: now,
      lastSyncedAt: now,
      readiness: [],
    };
    const completed = {
      ...base,
      goals: [
        {
          id: "g",
          status: "COMPLETED",
          priority: "CRITICAL",
          reason: null,
          hasTarget: true,
        },
      ],
    };
    expect(
      generateRecommendations(context({ characters: [completed] })).candidates,
    ).toHaveLength(0);
    const active = {
      ...base,
      goals: [
        {
          id: "g",
          status: "IN_PROGRESS",
          priority: "CRITICAL",
          reason: "Saved goal",
          hasTarget: true,
        },
      ],
    };
    expect(
      generateRecommendations(
        context({ characters: [active] }),
      ).candidates.some((c) => c.type === "COMPLETE_ACTIVE_GOAL"),
    ).toBe(true);
  });
  it("separates exact and heuristic advisors", () => {
    const resources = [
      {
        resourceType: "ORB",
        records: 5,
        total: 2,
        zero: 2,
        low: 1,
        confidence: "PARTIAL",
        explanation: "Directional only",
      },
    ];
    const result = generateRecommendations(context({ resources }));
    expect(result.candidates[0].confidence).toBe("HEURISTIC");
  });
  it("emits manual campaign blockers and high-confidence assignment review", () => {
    const campaigns = [
      {
        id: "p",
        name: "Campaign",
        semanticStatus: "PARTIAL",
        isActive: null,
        lastSyncedAt: now,
        plan: {
          id: "plan",
          status: "BLOCKED",
          priority: "CRITICAL",
          objective: "Advance",
          blocker: "Review team",
          targetDate: null,
          teamId: null,
          teamMemberCount: 0,
        },
      },
    ];
    const result = generateRecommendations(context({ campaigns }));
    expect(
      result.candidates.some(
        (c) =>
          c.type === "REVIEW_CAMPAIGN_BLOCKER" && c.confidence === "MANUAL",
      ),
    ).toBe(true);
    expect(
      result.candidates.some(
        (c) => c.type === "ASSIGN_TEAM" && c.confidence === "HIGH",
      ),
    ).toBe(true);
  });
  it("withholds stale source-dependent actions and emits refresh", () => {
    const stale = new Date(now.getTime() - 49 * 3_600_000);
    const resources = [
      {
        resourceType: "ORB",
        records: 5,
        total: 2,
        zero: 2,
        low: 1,
        confidence: "PARTIAL",
        explanation: "Directional only",
      },
    ];
    const result = generateRecommendations(
      context({ lastSuccessfulSyncAt: stale, resources }),
    );
    expect(result.candidates.some((c) => c.type === "REFRESH_STALE_DATA")).toBe(
      true,
    );
    expect(
      result.candidates.some((c) => c.type === "REVIEW_RESOURCE_PRESSURE"),
    ).toBe(false);
  });
  it("returns an empty set when no justified action exists", () => {
    expect(generateRecommendations(context()).candidates).toEqual([]);
  });
});
