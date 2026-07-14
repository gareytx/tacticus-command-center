import { db } from "../src/lib/db";
import { buildRecommendationContext } from "../src/services/recommendation.service";
import { generateRecommendations } from "../src/lib/recommendations/engine";
import { assertSafeEvidence } from "../src/lib/recommendations/evidence";
async function main() {
  const now = new Date();
  const [all, context] = await Promise.all([
    db.recommendation.findMany(),
    buildRecommendationContext(now),
  ]);
  const active = all.filter((r) => r.status === "ACTIVE");
  const generated = generateRecommendations(context);
  const generatedFingerprints = new Set(
    generated.candidates.map((c) => c.fingerprint),
  );
  const duplicateFingerprints =
    active.length - new Set(active.map((r) => r.fingerprint)).size;
  let missingEvidence = 0,
    insufficientPositive = 0,
    sensitiveEvidence = 0,
    invalidScores = 0,
    staleActive = 0,
    missingTargets = 0,
    completedGoalActive = 0,
    ignoredInvestmentActive = 0,
    unreproducible = 0;
  for (const r of active) {
    let evidence: unknown[] = [];
    try {
      evidence = JSON.parse(r.evidenceJson);
      if (!Array.isArray(evidence) || !evidence.length) missingEvidence++;
      else assertSafeEvidence(evidence as never);
    } catch {
      sensitiveEvidence++;
    }
    if (
      r.confidence === "INSUFFICIENT_DATA" &&
      r.type !== "NO_ACTIONABLE_RECOMMENDATION"
    )
      insufficientPositive++;
    if (r.priorityScore < 0 || r.priorityScore > 1000) invalidScores++;
    if (r.staleAt && r.staleAt <= now) staleActive++;
    if (!generatedFingerprints.has(r.fingerprint)) unreproducible++;
    if (r.targetEntityType === "UPGRADE_GOAL") {
      const goal = await db.upgradeGoal.findUnique({
        where: { id: r.targetEntityId ?? "" },
        include: { character: true },
      });
      if (!goal) missingTargets++;
      else {
        if (["COMPLETED", "CANCELLED"].includes(goal.status))
          completedGoalActive++;
        if (goal.character.investmentStatus === "IGNORE_FOR_NOW")
          ignoredInvestmentActive++;
      }
    } else if (r.targetEntityType === "CHARACTER") {
      const c = await db.character.findUnique({
        where: { id: r.targetEntityId ?? "" },
      });
      if (!c) missingTargets++;
      else if (
        c.investmentStatus === "IGNORE_FOR_NOW" &&
        [
          "ADVANCE_READY_UNIT",
          "REVIEW_BLOCKED_UNIT",
          "COMPLETE_ACTIVE_GOAL",
        ].includes(r.type)
      )
        ignoredInvestmentActive++;
    } else if (
      r.targetEntityType === "CAMPAIGN" &&
      !(await db.campaignDefinition.count({
        where: { id: r.targetEntityId ?? "" },
      }))
    )
      missingTargets++;
    else if (
      r.targetEntityType === "EVENT" &&
      !(await db.eventDefinition.count({
        where: { id: r.targetEntityId ?? "" },
      }))
    )
      missingTargets++;
  }
  const checks = {
    duplicateFingerprints: duplicateFingerprints === 0,
    evidencePresent: missingEvidence === 0,
    insufficientSuppressed: insufficientPositive === 0,
    completedGoalsSuppressed: completedGoalActive === 0,
    ignoredInvestmentSuppressed: ignoredInvestmentActive === 0,
    noStaleActive: staleActive === 0,
    sensitiveEvidenceRejected: sensitiveEvidence === 0,
    reproducible: unreproducible === 0,
    scoreBounds: invalidScores === 0,
    targetsExist: missingTargets === 0,
    advisorOutputsValidated: generated.rejected === 0,
  };
  if (Object.values(checks).some((v) => !v))
    throw new Error(
      `Recommendation audit failed: ${JSON.stringify({ checks, missingEvidence, insufficientPositive, sensitiveEvidence, invalidScores, staleActive, missingTargets, completedGoalActive, ignoredInvestmentActive, unreproducible })}`,
    );
  const confidenceCounts = Object.fromEntries(
    ["EXACT", "HIGH", "HEURISTIC", "MANUAL"].map((c) => [
      c,
      active.filter((r) => r.confidence === c).length,
    ]),
  );
  const advisorCounts = Object.fromEntries(
    [...new Set(active.map((r) => r.advisorSource))]
      .sort()
      .map((a) => [a, active.filter((r) => r.advisorSource === a).length]),
  );
  console.log(
    JSON.stringify(
      {
        checks,
        activeCount: active.length,
        confidenceCounts,
        advisorCounts,
        suppressed: generated.suppressed,
        rejected: generated.rejected,
        types: [...new Set(active.map((r) => r.type))].sort(),
        topTen: active
          .sort((a, b) => b.priorityScore - a.priorityScore)
          .slice(0, 10)
          .map((r) => ({
            score: r.priorityScore,
            type: r.type,
            summary: r.summary,
            target: r.targetLabel,
          })),
      },
      null,
      2,
    ),
  );
}
main().finally(() => db.$disconnect());
