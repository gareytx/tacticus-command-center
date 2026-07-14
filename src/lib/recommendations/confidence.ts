import type { RecommendationConfidence } from "./types";
export const CONFIDENCE_ORDER: Record<RecommendationConfidence, number> = {
  EXACT: 5,
  HIGH: 4,
  MANUAL: 3,
  HEURISTIC: 2,
  INSUFFICIENT_DATA: 0,
};
export function strongestConfidence(
  values: RecommendationConfidence[],
): RecommendationConfidence {
  return (
    [...values].sort((a, b) => CONFIDENCE_ORDER[b] - CONFIDENCE_ORDER[a])[0] ??
    "INSUFFICIENT_DATA"
  );
}
