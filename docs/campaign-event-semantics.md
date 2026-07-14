# Campaign and event semantics

## Evidence boundary

This document records the Phase 2D interpretation of the official Tacticus Player API inspected on 2026-07-14. The authoritative sources are the live [OpenAPI document](https://api.tacticusgame.com/api-docs) and the official [API changelog](https://github.com/SnowprintStudios/tacticus-api/blob/main/CHANGELOG.md). The sanitized player fixture is used only to prove supported shapes and local behavior; it is not treated as a universal game-rules database.

## Supported source fields

| Source path                                                                     | Meaning used locally                                                   | Confidence                     |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------ |
| `progress.campaigns[].id`                                                       | Upstream campaign identifier                                           | Exact                          |
| `progress.campaigns[].name`                                                     | Upstream label when non-empty                                          | Exact                          |
| `progress.campaigns[].type`                                                     | Upstream campaign variant                                              | Exact as a raw value           |
| `progress.campaigns[].battles[]`                                                | Exposed battle-attempt records                                         | Exact                          |
| `battleIndex`                                                                   | Upstream battle index; index 75 may be a sentinel rather than a battle | Exact value, partial semantics |
| `attemptsLeft`, `attemptsUsed`                                                  | Current attempt counters for that record                               | Exact                          |
| `progress.legendaryEvents[].id`                                                 | Legendary-event character identifier                                   | Exact                          |
| `currentPoints`, `currentCurrency`, `currentShards`, `currentClaimedChestIndex` | Current upstream counters                                              | Exact when present             |
| `lanes`, battle configs, objectives, restrictions, and lane progress            | Upstream lane configuration and recorded progress                      | Exact values                   |
| `currentEvent`                                                                  | Extra state for a currently running legendary event                    | Exact when present             |

The OpenAPI campaign type enum lists Standard, Mirror, Elite, and EliteMirror. Unknown additive values are retained visibly. The fixture also contains the verified campaign-event identifier `eventCampaign6`, so both records with that identifier are classified as `EVENT` through a source-controlled fixture mapping while their distinct raw types remain preserved. This mapping does not infer dates, rewards, eligibility, or rules.

## Deliberately unsupported inferences

The API does **not** supply campaign completion flags, earned or available stars, unlock state, required units, recommended power, event start/end dates, reward thresholds, mission state, battle-pass state, or roster success probability. Therefore:

- battle records are not presented as completed battles;
- attempt counters are not converted into a completion percentage;
- event activity is only asserted when `currentEvent` is present;
- a missing `currentEvent` means “not reported as currently running,” not “concluded”;
- campaign/event dates remain unknown unless entered locally;
- lane restrictions and objectives are shown as upstream rules, not required-owned-unit claims;
- no exact readiness or resource-cost claim is made without a verified local rule.

Unknown fields and unknown enum values are retained in sanitized JSON and receive an explicit `PARTIAL`, `UNKNOWN`, or `UNSUPPORTED` semantic status instead of being dropped.

## Local taxonomy

Campaigns normalize to `STANDARD`, `MIRROR`, `ELITE`, `EVENT`, or `UNKNOWN`. `EliteMirror` retains its raw upstream type and normalizes to `ELITE`. Legendary events normalize separately to `LEGENDARY_EVENT`. Quest, Survival, and Incursion are reserved local taxonomy values only; Phase 2D does not claim that the inspected Player API exposes them.

Every definition stores the upstream identifier, a collision-safe external key, raw type, normalization source, confidence, semantic status, last-sync time, and sanitized metadata. The collision-safe campaign key is `id::type`, because the fixture proves that one upstream campaign ID can occur with more than one type.

## Preview, apply, and preservation rules

Campaigns and legendary events join the existing preview/confirm/apply transaction. Preview reports create, update, unchanged, and rejected records. Apply upserts definitions and progress, records API-owned field changes against the roster snapshot, and updates the connection timestamp only after the transaction succeeds.

Manual names, manual classification, plan status, priority, objectives, blockers, notes, target dates, and preferred teams are local-owned fields. Synchronization never overwrites them. Upstream progress is API-owned and cannot overwrite local team membership, character notes, goals, priorities, roles, investment status, readiness verification, or campaign/event planning.

## Blocker and priority semantics

Blockers use only explicit evidence:

- `EXACT`: a locally assigned unit is not owned, or a verified local target is unmet;
- `INFERRED`: an active local goal/readiness record supports a directional blocker;
- `MANUAL`: the user entered the blocker;
- `INSUFFICIENT_DATA`: API requirements are unknown or no relevant local evidence exists.

Priority scoring is deterministic planning support, not a win prediction. It combines local priority/status, target-date proximity, current activity when explicitly reported, and blocker presence. Scores never imply success chance, required power, or reward value.

## Legendary-event foundation

Phase 2D stores lane configuration and progress as sanitized structured JSON plus exact top-level counters. This supports later lane-team assignment and objective optimization without inventing rules today. Future support must remain additive and must retain unknown upstream records visibly until their semantics are verified.
