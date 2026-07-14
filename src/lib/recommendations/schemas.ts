import { z } from "zod";
import { RECOMMENDATION_TYPES } from "./types";

export const confidenceSchema = z.enum([
  "EXACT",
  "HIGH",
  "HEURISTIC",
  "MANUAL",
  "INSUFFICIENT_DATA",
]);
export const evidenceSchema = z.object({
  evidenceType: z.string().min(1),
  sourceEntityType: z.string().min(1),
  sourceEntityId: z.string().nullable(),
  sourceField: z.string().min(1),
  observedValue: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  comparisonValue: z
    .union([z.string(), z.number(), z.boolean(), z.null()])
    .optional(),
  sourceTimestamp: z.string().datetime().nullable(),
  confidence: confidenceSchema,
  explanation: z.string().min(1).max(500),
});
export const candidateSchema = z.object({
  type: z.enum(RECOMMENDATION_TYPES),
  advisorSource: z.string().min(1),
  confidence: confidenceSchema,
  durationCategory: z.enum([
    "QUICK_REVIEW",
    "SHORT_ACTION",
    "FOCUSED_SESSION",
    "LONG_TERM_PLAN",
    "UNKNOWN_DURATION",
  ]),
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(500),
  explanation: z.string().min(1).max(1500),
  limitations: z.string().min(1).max(1000),
  evidence: z.array(evidenceSchema).min(1),
  targetEntityType: z.string().nullable(),
  targetEntityId: z.string().nullable(),
  targetLabel: z.string().nullable(),
  strategyPriority: z.string().nullable().optional(),
  investmentStatus: z.string().nullable().optional(),
  goalPriority: z.string().nullable().optional(),
  goalStatus: z.string().nullable().optional(),
  deadline: z.date().nullable().optional(),
  readiness: z
    .enum(["EXACT_READY", "HIGH_READY", "EXACT_SMALL_GAP"])
    .nullable()
    .optional(),
  staleSource: z.boolean().optional(),
});
export const recommendationActionSchema = z.object({
  recommendationId: z.string().min(1),
  action: z.enum([
    "COMPLETE",
    "DISMISS",
    "SNOOZE_TOMORROW",
    "SNOOZE_3_DAYS",
    "SNOOZE_1_WEEK",
    "RESTORE",
  ]),
});
export const feedbackSchema = z.object({
  recommendationId: z.string().min(1),
  response: z.enum([
    "HELPFUL",
    "NOT_HELPFUL",
    "ALREADY_DONE",
    "NOT_APPLICABLE",
    "NEEDS_MORE_CONTEXT",
  ]),
  note: z.string().max(1000).optional(),
});
