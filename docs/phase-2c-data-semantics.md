# Phase 2C data semantics

## Evidence policy

Phase 2C separates observed API facts, source-controlled mappings, local user facts, and unsupported inferences. The official player payload supplies unit progression snapshots and inventory quantities. It does **not** supply a unit-type field, upgrade recipes, XP-book values, promotion costs, rarity/star conversion rules, or the next progression threshold.

Consequently:

- `UnitTypeSource` and `UnitTypeConfidence` accompany every classification.
- The five confirmed fixture IDs are mapped as Machines of War. Reviewed ordinary unit IDs are mapped as characters. `thousDaemonPrince` and `tauBroadside` remain `UNKNOWN` pending authoritative evidence.
- A manual classification has source `MANUAL`, confidence `CONFIRMED`, and survives later syncs.
- Unknown upstream IDs remain `UNKNOWN`; no structural guess based on abilities, items, or rank is used.
- Inventory keeps the original `category` and metadata alongside normalized taxonomy fields.

## Inventory taxonomy

| Upstream container              | Resource type        | Semantic status            |
| ------------------------------- | -------------------- | -------------------------- |
| items                           | equipment            | partial                    |
| upgrades                        | upgrade material     | partial                    |
| shards / mythicShards           | shard / mythic shard | verified quantity identity |
| xpBooks                         | XP book              | partial                    |
| abilityBadges                   | ability badge        | partial                    |
| components                      | component            | partial                    |
| forgeBadges                     | forge badge          | partial                    |
| orbs                            | orb                  | partial                    |
| requisitionOrders / resetStones | matching resource    | verified quantity identity |
| additive or unknown container   | unknown              | unknown                    |

“Partial” means the item identity and stock can be shown, but upgrade demand cannot be computed. Unknown records use a stable fallback label and remain visible.

## Synchronization ownership

Official sync owns observed progression fields and normalized inventory facts. Strategy fields, local thresholds, notes, goals, manual verification, and manual unit classification remain locally owned. Team queries retain every unit type; they do not silently remove Machines of War or unknown units.
