# Readiness engine

## Opportunity model

The engine produces shard, level, rank, and ability opportunities for owned records. A shard opportunity is `EXACT` only when both `shardsOwned` and a positive local `shardsRequired` threshold exist. It is ready when owned is at least required and blocked otherwise. Without that local threshold it is explicitly `INSUFFICIENT_DATA`.

Level, rank, ability, equipment, ascension, and promotion costs are not included in the official payload. They therefore remain `UNKNOWN` / `INSUFFICIENT_DATA`; current values are never converted into fabricated requirements.

Manual verification records review state and evidence notes. It does not change calculation confidence or promote an unsupported result to exact.

## Priority score

Sorting is a transparent workflow score, not a combat tier rating:

- strategy priority: critical 500, high 400, medium 300, low 200, hold 100;
- investment status: invest now 80, mode priorities 60, maintain 20, ignore 0;
- exact ready 30 or exact blocked 20;
- any active local upgrade goal 25;
- a verified shard gap contributes up to 20 points, with smaller gaps ranked first.

Ties sort by unit name. Insufficient-data opportunities receive no readiness or gap bonus.

## Resource pressure

Inventory is grouped by normalized resource type. The display reports record count, total quantity, empty records, and low stock (1–3). Because recipes and per-opportunity demand are absent, the result is called inventory pressure—not a true bottleneck—and confidence remains partial or insufficient.

The engine is deterministic and computed from stored facts on request. A future cache or persisted recommendation table must store the input snapshot identity, engine version, and evidence provenance so results remain reproducible.
