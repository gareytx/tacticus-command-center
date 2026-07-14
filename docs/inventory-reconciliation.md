# Inventory reconciliation

## Conclusion

The reported `324` versus `322` difference is a **reporting inconsistency between two different upstream snapshots**, not normalization, merging, filtering, a uniqueness collision, or synchronization data loss.

- Sanitized fixture snapshot: `2026-07-14T10:36:52.000Z`
- Current database snapshot: `2026-07-14T13:29:05.000Z`

The database is almost three hours newer than the fixture. The older fixture contains three equipment records that are not in the newer database snapshot; the newer database contains one equipment record that is not in the older fixture. This is the exact net difference: `3 fixture-only − 1 database-only = 2`.

## Counts

| Measure                                | Count |
| -------------------------------------- | ----: |
| Incoming fixture records               |   324 |
| Normalized before persistence          |   324 |
| Unique external inventory IDs          |   324 |
| Unique persistence keys                |   324 |
| Zero-quantity records retained         |    12 |
| Duplicate external IDs                 |     0 |
| Rejected preview records               |     0 |
| Unknown resource types                 |     0 |
| Unknown semantic statuses              |     0 |
| Current database rows (newer snapshot) |   322 |
| Current rows matching fixture IDs      |   321 |
| Fixture-only IDs                       |     3 |
| Database-only IDs                      |     1 |
| Fresh fixture-backed database rows     |   324 |

Normalization produces one logical resource and one persistence key per fixture record. The persistence key is `externalInventoryId`, generated as `category:discriminator:base[:level-N]`. SQLite enforces a unique index on that value. The fixture has 324 distinct generated values, so no two records can merge or overwrite each other during the fixture-backed upsert.

## Exact snapshot differences

Fixture-only records, all classified by preview as `CREATE`:

| External ID                       | Safe label                   | Category / type   | Subtype            | Quantity | Outcome against current DB                                                   |
| --------------------------------- | ---------------------------- | ----------------- | ------------------ | -------: | ---------------------------------------------------------------------------- |
| `items::i-block-c008:level-1`     | Illusion Imagafier           | items / equipment | `I_Block_C008`     |        1 | Unmatched because snapshots differ; stored one-to-one in fixture-backed sync |
| `items::i-defensive-c002:level-1` | Standard-Issue MK X Pauldron | items / equipment | `I_Defensive_C002` |        1 | Unmatched because snapshots differ; stored one-to-one in fixture-backed sync |
| `items::i-crit-c008:level-1`      | Shuriken Pistol              | items / equipment | `I_Crit_C008`      |        1 | Unmatched because snapshots differ; stored one-to-one in fixture-backed sync |

Database-only record:

| External ID                          | Safe label               | Category / type   | Quantity | Meaning                                                               |
| ------------------------------------ | ------------------------ | ----------------- | -------: | --------------------------------------------------------------------- |
| `items::i-booster-crit-r001:level-1` | Sanctified Frag Grenades | items / equipment |        1 | Present in the newer database snapshot, absent from the older fixture |

No affected quantity was summed or merged. Apply uses an upsert keyed by the unique external ID: an existing row's quantity is replaced by the incoming snapshot quantity, while a new ID creates one row. Records absent from an incoming snapshot are retained rather than deleted. That retention policy prevents destructive loss but means “stored rows” should always be interpreted with the snapshot timestamp.

## Quantity reconciliation

The fixture contains a total quantity of `6,232`. A fresh fixture-backed sync stores exactly 324 rows with the same total quantity of `6,232`.

For the 321 IDs shared by the older fixture and current newer database, the database total is `6,270`. The database-only record adds 1, making the current stored total `6,271`. Preview reports 20 quantity changes if the older fixture is compared to the newer database. These are ordinary snapshot drift, not arithmetic loss. There are no taxonomy-field differences among shared IDs.

## Exhaustive deterministic reconciliation

Run:

```text
npm run audit:inventory
```

The command emits one JSON reconciliation object for each of the 324 fixture records. Every row includes external ID, category, safe label, normalized resource type, subtype, rarity, alliance, incoming and stored quantities, preview classification, current-database outcome, and expected fixture-sync outcome. `-- --summary` omits the 324-row appendix while retaining every exception and aggregate.

The exhaustive outcomes are:

- Fresh fixture-backed synchronization: 324 `Stored one-to-one`.
- Comparison to the newer personal database: 321 `Stored one-to-one`, 3 `Unmatched` pending creates.
- Intentionally merged: 0.
- Duplicate upstream record: 0.
- Rejected: 0.
- Filtered: 0, including all 12 zero-quantity records.
- Lost unexpectedly: 0.

## Category reconciliation

| Category           | Records |
| ------------------ | ------: |
| ability badges     |      18 |
| components         |       3 |
| forge badges       |       6 |
| items              |      39 |
| orbs               |      15 |
| requisition orders |       2 |
| reset stones       |       1 |
| shards             |     112 |
| upgrades           |     123 |
| XP books           |       5 |
| **Total**          | **324** |

## Safety and corrective action

The normalization and transaction code do not need a data-loss correction or migration. Regression coverage now proves:

- all 324 fixture records normalize to unique persistence IDs;
- preview accepts all 324 without rejection;
- all zero-quantity records survive;
- a fresh apply stores all fields and quantities one-to-one;
- total quantity is preserved;
- repeat apply is idempotent;
- all 324 resources enter readiness pressure analysis;
- manual unit classification and readiness verification survive sync;
- local notes, priority, investment status, goals, teams, member roles, and notes survive sync.

The audit command and this report correct the earlier ambiguous comparison. Counts from different snapshots must not be presented as though one were the persistence result of the other.
