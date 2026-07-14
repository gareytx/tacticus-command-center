# Official Tacticus Player API contract

Inspected from the live Snowprint OpenAPI document at `https://api.tacticusgame.com/api-docs` on **July 14, 2026**. The document identifies itself as OpenAPI 3.0.1, Tacticus API version `0.1 BETA`.

## Request

- Endpoint: `https://api.tacticusgame.com/api/v1/player`
- Method: `GET`
- Query parameters: none
- Required header: `X-API-KEY: <Player API key>`
- Required scope: `Player`
- Accept header used by Command Center: `Accept: application/json`
- Success: `200 OK` with a `Player Response`

The operation declares the API key as a required header parameter rather than an OpenAPI `securityScheme`. It does not use `Authorization` or a bearer prefix.

## Response used in Phase 2A

`Player Response` requires `player` and `metaData`. `player` requires `details`, `units`, `inventory`, and `progress`.

- `player.details.name`: required string; the only documented player identity field.
- `player.details.powerLevel`: required 32-bit integer.
- `metaData.configHash`: required string; used as the upstream response schema/config version.
- `metaData.lastUpdatedOn`: required 64-bit integer, Unix time in **seconds**. It is the time the cached player state was last fetched from the game server, not necessarily the HTTP response time.
- `metaData.scopes`: required string array. Phase 2A requires it to contain `Player`.
- `metaData.apiKeyExpiresOn`: optional 64-bit Unix timestamp in seconds; the description says it is empty when the key never expires. Command Center accepts it as absent or null.

The Player response does **not** document a player ID. `externalPlayerId` therefore remains null. Command Center shows “Not exposed by API” and uses exact player-name continuity as a limited account-mismatch safeguard. A display name is not treated as a durable invented ID.

## Units and inventory

Each required unit has `id`, `progressionIndex` (0–15), `xp`, `xpLevel` (1–50), `rank` (0–17), `abilities`, `upgrades`, `items`, `shards`, and `mythicShards`. `name`, `faction`, and `grandAlliance` are optional. Rank mapping is 0 Stone I, 3 Iron I, 6 Bronze I, 9 Silver I, 12 Gold I, 15 Diamond I, and 17 Diamond III. Abilities contain required `id` and level 0–50. Unit items require `slotId`, level, and `id`; name and rarity are optional.

Inventory requires arrays for `items`, `upgrades`, `shards`, `mythicShards`, `xpBooks`, `components`, and `forgeBadges`; maps of arrays for `abilityBadges` and `orbs`; and `resetStones`. `requisitionOrders` is optional. Phase 2B normalizes these containers into stable inventory records after preview confirmation.

Known rarity values are Common, Uncommon, Rare, Epic, Legendary, and Mythic. Grand alliances are Imperial, Xenos, and Chaos. Item slots are Slot1, Slot2, and Slot3. Campaign types are Standard, Mirror, Elite, and EliteMirror. Runtime schemas pass through unknown object fields, while normalization maps unrecognized enum strings to `UNKNOWN`.

Optional names, faction, alliance, item metadata, key expiry, requisition orders, and optional progress modes are accepted as absent or null where the live API may omit data. Fields Command Center depends on—identity name, scopes, config hash, timestamps, required unit facts, and required inventory containers—must validate completely or nothing is persisted.

## Errors and operating behavior

- `403`: documented as Forbidden with `{ "type": "FORBIDDEN" }`. Command Center presents this as missing Player read access.
- `500`: documented as “Unknown error, retryable” with `{ "type": "UNKNOWN_ERROR" }`. Command Center performs at most one bounded retry.
- `401`: not documented for this operation; handled defensively as an unaccepted key.
- `429`: not documented; handled defensively and `Retry-After` is captured for user guidance without automatic flooding.
- Timeout: not documented; Command Center imposes a 10-second client timeout.
- Other 5xx: handled as temporary API unavailability.
- Rate-limit headers or quotas: none are documented in the live OpenAPI document, portal, README, or changelog inspected. The client uses manual sync, a 30-second local cooldown, and no polling.

Unknown response fields are retained through validation. Additive inventory containers with amount-bearing records are normalized using their upstream category names. Phase 2D supports the documented campaign attempt records and legendary-event lane/counter fields under the evidence boundaries in [campaign-event-semantics.md](./campaign-event-semantics.md). Completion, stars, event dates, reward thresholds, eligibility, and required units remain explicitly unavailable.

## Phase 2B field mapping

Character imports use `unit.id` as both the stable external character ID and current definition ID; `name`, `faction`, and `grandAlliance` provide creation metadata. `xpLevel`, numeric `rank`, the first two ordered ability levels, `shards`, and `mythicShards` map to API-owned roster fields. Rank uses the documented 0–17 sequence from Stone I through Diamond III. `progressionIndex` is validated and retained in the preview payload, but rarity/star derivation is intentionally not guessed because the published contract does not define that conversion.

Inventory uses every documented container: `items`, `upgrades`, `shards`, `mythicShards`, `xpBooks`, `abilityBadges`, `components`, `forgeBadges`, `orbs`, optional `requisitionOrders`, and `resetStones`. Stable IDs combine category, group discriminator where present, and the documented record ID/name. Category and upstream metadata are strings/JSON rather than brittle enums; unfamiliar rarity strings normalize to `UNKNOWN`.
