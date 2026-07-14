# Data model

`Character` is the central roster record and owns zero or more `UpgradeGoal` and `TeamMember` records. `TeamMember` joins a `Character` to a `Team`.

- Character slugs are unique.
- Team member `(teamId, position)` and `(teamId, characterId)` pairs are unique, preventing duplicate positions and duplicate characters within a team.
- Deleting a character or team cascades through dependent membership records. Deleting a character also removes its goals.
- Unknown progression values are nullable; identity, alliance, priority, investment status, and ownership remain explicit.
- Ranks are an ordered enum from Stone I through Diamond III.
- Imports use schema version 1 and are validated before a transaction begins.

See `prisma/schema.prisma` for the authoritative field and enum definitions.
