# Tacticus Command Center

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

## Current limitations

This release is single-user and local only. It does not include authentication, cloud sync, public sharing, external game APIs, copyrighted game artwork, screenshot extraction, material inventory, or automated recommendations. Portrait URLs are reserved for user-supplied or properly licensed images.

## Future direction

See [docs/roadmap.md](docs/roadmap.md) for farming, campaign, materials, screenshot verification, cloud sync, and sharing phases.
