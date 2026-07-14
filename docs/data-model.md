# Data model

`Character` is the central roster record and owns zero or more `UpgradeGoal` and `TeamMember` records. `TeamMember` joins a `Character` to a `Team`.

- Character slugs are unique.
- Team member `(teamId, position)` and `(teamId, characterId)` pairs are unique, preventing duplicate positions and duplicate characters within a team.
- Deleting a character or team cascades through dependent membership records. Deleting a character also removes its goals.
- Unknown progression values are nullable; identity, alliance, priority, investment status, and ownership remain explicit.
- Ranks are an ordered enum from Stone I through Diamond III.
- Imports use schema version 1 and are validated before a transaction begins.

See `prisma/schema.prisma` for the authoritative field and enum definitions.

## Official API connection

`TacticusPendingConnection` stores one short-lived AES-256-GCM-encrypted credential between test and explicit confirmation. `TacticusConnection` stores the confirmed encrypted credential, safe player-name continuity field, scopes, fingerprint, and sync status. `TacticusSyncRun` records safe attempt outcomes and cascades on disconnect. Optional `userId` fields reserve a future ownership relation; Phase 2A allows one local connection and does not add authentication.

## Tacticus synchronization ownership

`Character.externalCharacterId` is unique and becomes the durable match key after first import. `externalDefinitionId`, `syncSource`, `lastSyncedAt`, `upstreamUpdatedAt`, and `mythicShardsOwned` record upstream facts without changing strategy ownership. `InventoryItem.externalInventoryId` is unique; category and rarity are strings so additive upstream values remain representable.

`TacticusSyncPreview` stores a short-lived normalized payload, never credentials. `RosterSnapshot` belongs to one connection and sync run. `CharacterChange` and `InventoryChange` store field, previous/new value, external ID, timestamp, and snapshot relation. Indexes cover sync runs, last-synced timestamps, and changes by entity.

Local-owned fields are `priority`, `investmentStatus`, `notes`, team membership/role/notes, upgrade goals, campaign assignments, recommendations, and strategy tags. API-owned fields are ownership, character level, rank, ability levels, shards/mythic shards, external identifiers, and upstream timestamps.

## Phase 2C readiness

`Character.unitType`, `unitTypeSource`, and `unitTypeConfidence` distinguish characters, Machines of War, and unresolved records with provenance. A manual classification is locally owned and sync-protected. `InventoryItem` adds normalized resource type, subtype, alliance restriction, semantic status, and upstream resource identity while retaining its original category and metadata.

`ReadinessVerification` stores a review status and optional note under a stable opportunity key. It is deliberately separate from computed readiness: verification does not manufacture recipe data or upgrade confidence. Deleting a character cascades its verification records.

## Phase 2D progression intelligence

`CampaignDefinition` and `EventDefinition` contain stable upstream identity and semantic classification. Their one-to-one progress records contain API-owned counters and sanitized structured progress. Their optional plan records contain user-owned status, priority, objective, blocker, strategy notes, target date, and preferred team. Progress and plan changes are separate histories, and API progress changes reference the same `RosterSnapshot` used by roster and inventory synchronization.

Campaign external identity is unique on `externalKey = id::type`, while `externalCampaignId` remains indexed and non-unique because the sanitized fixture proves repeated IDs across variants.
