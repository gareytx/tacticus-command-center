# Phase 3A recommendation semantics

Implementation date: 2026-07-14

## Purpose and evidence boundary

The recommendation engine answers what locally supported action deserves attention next. It is a planning aid derived from the synchronized account plus user-owned strategy. It is not a tier list, combat simulator, farming planner, or statement about global unit value.

Every persisted recommendation contains structured evidence. A candidate without evidence, with a sensitive field name, or with only `INSUFFICIENT_DATA` confidence is withheld from the positive action list.

## Available evidence and ownership

| Evidence                                                     | Owner                                         | Permitted use                                                             |
| ------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------- |
| Character ownership, levels, ranks, shards, sync timestamps  | Official API                                  | Safe normalized facts only                                                |
| Inventory quantities and resource taxonomy                   | Official API plus conservative local taxonomy | Heuristic pressure review; never exact demand                             |
| Campaign attempt records and Legendary Event counters/lanes  | Official API                                  | Progress review only; attempts are not wins or completion                 |
| Sync run, snapshot, and last-success timestamps              | Application                                   | Exact freshness checks and provenance                                     |
| Character priority and investment status                     | User                                          | Strategy weighting and suppression of `IGNORE_FOR_NOW` investment actions |
| Upgrade goals and their status                               | User                                          | Goal actions and completion suppression                                   |
| Campaign/event plans, objectives, blockers, dates, and teams | User                                          | Planning actions, manual blockers, and exact saved deadlines              |
| Team membership and empty assignment state                   | User                                          | Assignment/review evidence; never battle-success evidence                 |
| Readiness output                                             | Deterministic local engine                    | Exact only where the engine has a verified threshold; otherwise review    |
| Readiness verification and notes                             | User                                          | Manual evidence and review state                                          |
| Unit/campaign/event classification                           | Verified mapping or user                      | Data-quality review when unknown or partial                               |
| Strategic objective and reflection preference                | User                                          | Narrow target-aligned score bonus; reflection is never scored             |

Credentials, encryption material, authorization headers, connection secrets, and raw player payloads are never evidence.

## Exact, high, heuristic, manual, and insufficient confidence

- `EXACT`: directly reproducible from a normalized fact or deterministic verified calculation, such as a stale timestamp or a met local shard threshold.
- `HIGH`: several explicit local facts support the action, such as a critical plan with an incomplete assigned team.
- `HEURISTIC`: a useful directional signal whose demand or outcome is not modeled, such as low inventory pressure.
- `MANUAL`: the recommendation is driven principally by a user-entered objective, blocker, or verification.
- `INSUFFICIENT_DATA`: the idea cannot support a positive action. It may be converted into a narrowly worded review recommendation with evidence describing the missing field; otherwise it is suppressed.

Exact recommendations are limited to evidence state, not game outcomes. The engine cannot make exact claims about rank-ups unless a verified local threshold already models that specific readiness fact.

## Withheld recommendation categories

The engine withholds farming nodes, energy costs, drop rates, campaign rewards, upgrade recipes, badge/orb costs, required power, battle-success probability, event eligibility, unlock prediction, final event score, mode effectiveness, global character rankings, Guild Raid analysis, Arena optimization, Onslaught selection, and Salvage Run selection.

## Command Center Priority Score

The score is bounded to `0..1000` and is described in the interface as: “A local planning score based on your saved priorities and verified account evidence. It is not a global unit rating or battle-success prediction.”

Components:

- Strategy priority: Critical 500, High 400, Medium 300, Low 200, Hold 50, none 100.
- Investment: Invest Now +120, Campaign Priority +100, Event Priority +90, Guild Raid Priority +70, Arena Priority +60, Maintain +10, Ignore For Now −250.
- Confidence: Exact +100, High +70, Manual +60, Heuristic +20. Insufficient data is ineligible.
- Goals: active critical +100, active high +75, blocked active +50, otherwise 0. Completed goals suppress their recommendation.
- Exact saved deadline: within 24 hours +150, three days +100, seven days +50. Missing dates receive no deadline points.
- Readiness: exact ready +120, high ready +90, exact verified small gap +70, unknown cost +0.
- Stale source data subtracts 200 and suppresses source-dependent action candidates; a refresh recommendation is generated instead.
- A user-selected strategic objective adds 40 only when its entity type and ID exactly match the recommendation target.

Tie-breaking is deterministic: score descending, confidence order (`EXACT`, `HIGH`, `MANUAL`, `HEURISTIC`), recommendation type, target entity type, target entity ID, then fingerprint.

## Fingerprints, deduplication, and regeneration

`lifecycleKey` identifies the advisor/type/target relationship. `fingerprint` hashes the lifecycle key plus sorted structured evidence and relevant local strategy. Regeneration updates an identical fingerprint without duplicating it. An evidence-material change creates a new fingerprint and marks the prior lifecycle record `SUPERSEDED`.

Dismissal and snooze survive identical regeneration. A materially changed fingerprint may reactivate the recommendation. Snoozed recommendations become active after their deadline during regeneration. Completed recommendations remain completed unless material evidence creates a new fingerprint. Recommendations no longer emitted are marked `STALE`; stale records never appear as current.

Regeneration occurs after an applied sync and after supported local changes to priority, classification, goals, teams, campaign/event plans, readiness verification, or strategic objective. It is also available through an explicit rebuild command/control. Page rendering never regenerates recommendations.

## Freshness and lifecycle

Official account evidence is current for 48 hours after the last successful sync. After that threshold, source-dependent candidates are withheld and an exact `REFRESH_STALE_DATA` recommendation is emitted. Generated records also carry a seven-day review horizon. Statuses are `ACTIVE`, `SNOOZED`, `DISMISSED`, `COMPLETED`, `STALE`, and `SUPERSEDED`.

- Dismiss: preserves the record and feedback history.
- Snooze: hides the recommendation until tomorrow, three days, one week, or a validated local date.
- Complete: records local acknowledgement; it does not alter the target game/account state.
- Restore: returns a non-stale record to active.
- Feedback: appends `HELPFUL`, `NOT_HELPFUL`, `ALREADY_DONE`, `NOT_APPLICABLE`, or `NEEDS_MORE_CONTEXT`; it never silently changes scoring.

## Time-budget planning

Recommendations use structural duration categories: `QUICK_REVIEW`, `SHORT_ACTION`, `FOCUSED_SESSION`, `LONG_TERM_PLAN`, and `UNKNOWN_DURATION`. A selected 10–60 minute budget changes ordering/categories shown, not an estimate of actual play duration. No energy or measured duration is inferred.

## Strategic objective and reflection

The strategic objective is optional local state and influences scoring only for an exact target entity match. The Reflection section is disabled by default, stored locally, uses a short curated set of ESV references plus original reflection text, and is isolated from recommendation generation and scoring.

## Known limitations

Inventory pressure is not verified demand. Campaign attempt arrays are not completion. Event dates are absent unless explicitly entered in a local plan. Team assignment does not establish eligibility or effectiveness. A recommendation explains what evidence supports review or planning, but never promises an in-game result.
