import type { Evidence, RecommendationCandidate } from "./types";

const SENSITIVE =
  /(api.?key|authorization|credential|encrypt|cipher|auth.?token|access.?token|refresh.?token|password|secret|raw.?payload|player.?payload)/i;
export function assertSafeEvidence(evidence: Evidence[]) {
  for (const item of evidence) {
    if (
      SENSITIVE.test(item.sourceField) ||
      SENSITIVE.test(item.evidenceType) ||
      SENSITIVE.test(item.explanation)
    )
      throw new Error("Sensitive evidence field rejected");
    if (
      typeof item.observedValue === "string" &&
      /Bearer\s+[A-Za-z0-9._-]+/i.test(item.observedValue)
    )
      throw new Error("Authorization value rejected");
  }
}
export function validateEvidenceCandidate(candidate: RecommendationCandidate) {
  if (!candidate.evidence.length)
    throw new Error("Recommendation evidence is required");
  assertSafeEvidence(candidate.evidence);
  if (
    candidate.confidence === "INSUFFICIENT_DATA" &&
    candidate.type !== "NO_ACTIONABLE_RECOMMENDATION"
  )
    throw new Error("Insufficient-data candidates cannot be positive actions");
  const unsupported =
    /(farm(ing)? node|energy cost|drop rate|battle success|win probability|global tier|upgrade recipe|required power|event eligibility)/i;
  if (
    unsupported.test(
      `${candidate.title} ${candidate.summary} ${candidate.explanation}`,
    )
  )
    throw new Error("Unsupported recommendation claim rejected");
  return candidate;
}
