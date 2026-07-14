# Recommendation scoring

The Command Center Priority Score is a deterministic `0..1000` local planning score. It combines saved priority, investment status, evidence confidence, active-goal state, exact local deadlines, verified readiness, freshness, and an exact strategic-objective target match.

Weights and tie-breaking are authoritative in [Phase 3A semantics](./phase-3a-recommendation-semantics.md). Missing deadlines receive no urgency points. Resource pressure remains heuristic. `IGNORE_FOR_NOW` suppresses investment recommendations. Completed goals suppress their active-goal recommendation.

The score is not a global unit rating, value judgment, or battle-success prediction.
