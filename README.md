# Tacticus Command Center

Phase 2C adds evidence-aware upgrade readiness, explicit Character / Machine of War / Unknown classification, normalized inventory taxonomy, resource-pressure analysis, and manual verification. See [data semantics](docs/phase-2c-data-semantics.md) and the [readiness engine](docs/readiness-engine.md).

Tacticus Command Center is a local-first personal roster, progression, and strategy-management application for Warhammer 40,000: Tacticus. It stores a structured roster so planning can use real character investment data instead of scattered screenshots.

> Unofficial fan-made roster tool. Not affiliated with or endorsed by Games Workshop or Snowprint Studios.

## Screenshots

Screenshots will be added after the first roster is populated. Suggested captures: dashboard, roster card view, character detail, priority board, and team formation.

## Stack

Next.js App Router, strict TypeScript, Tailwind CSS, Prisma, SQLite, Zod, Vitest, Playwright, ESLint, and Prettier.

## Local setup

1. Install Node.js 20.9 or newer and run `npm install`.
2. Copy `.env.example` to `.env`. The default `DATABASE_URL="file:./dev.db"` stores the database in `prisma/dev.db`.
3. Run `npm run db:migrate -- --name init`.
4. Run `npm run db:seed`.
5. Start the application with `npm run dev`, then open `http://localhost:3000`.

## Commands

- `npm run dev` — local development
- `npm run build` / `npm start` — production build and server
- `npm run typecheck` — strict TypeScript check
- `npm run lint` — ESLint
- `npm test` — Vitest unit tests
- `npm run test:e2e` — Playwright smoke test
- `npm run format` / `npm run format:check` — Prettier
- `npm run db:studio` — local Prisma data browser

## JSON import and export

Data management exports schema version 1 with `exportedAt`, `characters`, `teams`, `teamMembers`, and `upgradeGoals`. Import validates the whole file before showing creates, updates, and rejects. Applying requires confirmation and first copies the SQLite database into `backups/`. Keep exports and backups private because notes can contain personal planning information.

## Official Player API integration

The local integration at `/settings/integrations/tacticus` connects to Snowprint's official read-only Player API. It tests the key server-side, shows the documented player name and record counts for confirmation, and encrypts the credential with AES-256-GCM.

Generate a key with only the **Player** scope from the [official Tacticus API portal](https://api.tacticusgame.com/settings). Do not enable Guild or Guild Raid scopes for Command Center Phase 2A.

Add a base64-encoded 32-byte encryption key to the local `.env` file:

```text
TACTICUS_CREDENTIAL_ENCRYPTION_KEY="..."
```

One safe way to generate a value locally is `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`. Paste its output into `.env`; never commit or share it. If the master key is lost or changed, disconnect and reconnect the API credential because existing ciphertext cannot be recovered.

Run `npm run dev`, open the integration page, and choose **Test Connection**. After choosing **Connect This Account**, every import follows **Preview Sync → Confirm and apply**. Previewing does not change the database. Confirmation applies character mappings, API-owned progression fields, inventory, snapshot metadata, and structured changes in one transaction. Local priorities, investment status, notes, teams, roles, and upgrade goals are preserved.

Security limitations: this release relies on localhost and same-origin checks because the application has no user-authentication system yet. Other software running as the same operating-system user may be able to access the local app. Keep the server bound locally, protect `.env` and `prisma/dev.db`, and do not publish the application. The official endpoint does not expose a player ID, so Phase 2A uses exact player-name continuity as a limited mismatch check.

## Current limitations

This release is single-user and local only. It does not include authentication, cloud sync, public sharing, copyrighted game artwork, screenshot extraction, or unsupported combat predictions. Phase 2D adds evidence-aware campaign and legendary-event synchronization at `/campaigns`, `/events`, and `/brief`. Portrait URLs are reserved for user-supplied or properly licensed images.

## Future direction

See [docs/roadmap.md](docs/roadmap.md) for farming, campaign, materials, screenshot verification, cloud sync, and sharing phases.

The current sanitized development fixture contains 59 characters and 324 inventory records plus campaign and legendary-event progress used by Phase 2D. See [campaign and event semantics](docs/campaign-event-semantics.md) for supported fields and explicit limitations.
