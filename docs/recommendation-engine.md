# Recommendation engine

Phase 3A centralizes recommendation generation under `src/lib/recommendations`. The engine gathers normalized account and local-strategy evidence, runs modular readiness, campaign, event, resource, goal, data-quality, and review advisors, validates every candidate, scores it, deduplicates it, and passes it to the persistence lifecycle.

Advisors may propose only actions supported by their evidence. Candidate schemas require structured evidence, an advisor, confidence, target, duration category, explanation, and limitation. The evidence guard rejects credential-like fields and unsupported claims. `INSUFFICIENT_DATA` cannot become a positive recommendation.

Generation is explicit after supported mutations and synchronization, or through the rebuild control/backfill command. Rendering `/recommendations` or `/brief` never regenerates state.

Unsupported categories include farming nodes, energy, drop rates, recipes, battle outcomes, required power, event eligibility, mode effectiveness, and tier rankings.
