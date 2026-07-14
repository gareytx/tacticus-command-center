# Tacticus synchronization design

## Server-only flow

The browser sends a Player API key once to a same-origin, localhost-only route. The route validates input and calls the official Player endpoint from Node.js. Client bundles never import the API client, encryption code, or credential services. Responses contain only safe summaries.

## Credential lifecycle and confirmation

The master key comes from `TACTICUS_CREDENTIAL_ENCRYPTION_KEY`, decoded from base64 and required to be exactly 32 bytes. AES-256-GCM uses a fresh 12-byte IV and stores ciphertext, IV, and authentication tag separately. A truncated SHA-256 fingerprint supports display and duplicate detection but cannot recover the key.

Testing creates one short-lived encrypted pending record with a random confirmation capability stored only as a hash. The raw key is never returned. “Connect This Account” consumes that capability, enforces one active local connection, transfers the encrypted credential into the durable connection record, and deletes pending state. The optional `userId` fields reserve an ownership boundary for a future user relation without inventing authentication now.

## Sync lifecycle

Manual sync decrypts the key only in memory, marks the connection syncing, creates a run, fetches and validates the complete required contract, verifies the documented player name still matches, records safe counts/timestamps/config hash, writes a sanitized fixture, and completes the run. Existing characters, teams, priorities, notes, goals, and inventory are untouched. Concurrent runs are rejected and attempts inside a 30-second cooldown are blocked. There is no polling.

## Redaction and errors

Typed errors expose fixed safe codes and messages. Upstream bodies, API keys, authorization-like headers, and raw exception strings are never logged or stored. Request IDs may be retained in memory for diagnostics but are not displayed as credentials. The secret scanner checks tracked files for likely keys and authorization values.

## Sanitized fixtures

A successful sync recursively replaces player names, player/user/account/guild/device identifiers, emails, tokens, API keys, credentials, and authentication metadata before writing `test/fixtures/tacticus/player-state.sanitized.json`. The sanitizer is tested before fixture writing. Complete raw responses are never written. No fixture is generated until a real local connection successfully syncs.

## Disconnect

Disconnect requires browser confirmation, deletes the connection and encrypted credential through a cascading delete, and clears pending connection state. Safe sync-run history is deleted with the connection to minimize local linkage. Ordinary Command Center records are preserved.

## Phase 2B preview and apply

A manual preview fetches and validates fresh Player state, normalizes all unit and inventory records, compares them with the database, and stores a server-side payload behind a hashed random capability for ten minutes. The browser receives classifications and change descriptions, never the credential or raw response. Apply requires `{ confirmed: true }`, an unexpired capability, and exact player-name continuity.

The apply transaction creates a sync run and uniquely identified roster snapshot, then upserts external mappings, API-owned character fields, inventory quantities/metadata, and field-level change records. Any validation or database failure rolls back the entire transaction. Repeating the same payload uses unique external IDs and creates no duplicate entities. Snapshots and their change records are retained until their connection is deleted; no API key or sensitive account metadata is stored in them.

First import recognizes the 11 original seed records through a fixture-verified external-ID-to-slug table. After that write, the external ID is the permanent key. Complete unknown units are created automatically; incomplete alliance metadata is shown as unmatched, and duplicate IDs are rejected rather than discarded. Local strategy columns and relations are absent from every sync update.

The verified first-import mappings are `ultraInceptorSgt` → Bellator, `ultraTigurius` → Varro Tigurius, `ultraEliminatorSgt` → Certus, `darkaAzrael` → Azrael, `bloodDante` → Dante, `bloodIntercessor` → Mataneo, `necroSpyder` → Aleph-Null, `necroOverlord` → Anuphet, `blackPossession` → Archimatos, `blackHaarken` → Haarken Worldclaimer, and `eldarMauganRa` → Maugan Ra.

The fixture contributes `id`, `name`, `faction`, `grandAlliance`, `xpLevel`, `rank`, the first two ordered ability levels, `shards`, `mythicShards`, and `progressionIndex` for character normalization. `progressionIndex` remains validated preview context because Snowprint does not document a safe rarity/star conversion. Inventory uses `id` or name, amount, rarity where present, its container category, and remaining record fields as upstream metadata. Unknown future amount-bearing containers are retained under their upstream category.

## Phase boundaries

Phase 2B covers roster and inventory. Phase 2D adds campaign definitions/progress and legendary-event definitions/progress to the same preview and transaction. Collision-safe campaign keys preserve repeated upstream IDs with distinct types. API-owned progress changes are attached to the roster snapshot; local plans, teams, names, classifications, notes, priorities, blockers, and target dates are never overwritten. Campaign completion, stars, event dates, eligibility, guild data, and background polling remain unsupported.

## Phase 2C enrichment

Apply now enriches synchronized units through a source-controlled type catalog and inventory records through a centralized taxonomy. A record absent from the catalog remains `UNKNOWN`; payload shape is not used as a type heuristic. Sync skips all unit-type fields when their source is `MANUAL`, and never touches readiness verification records or local shard thresholds.

The taxonomy describes resource identity and stock, not upgrade demand. Upstream category and metadata remain available for future reclassification. Existing databases receive the same conservative backfill through migrations, while `scripts/backfill-phase-2c.ts` provides an idempotent repair path using the current classifiers.
