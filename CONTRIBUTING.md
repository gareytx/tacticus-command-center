# Contributing

This is currently a personal local-first project. Keep changes focused, preserve strict TypeScript and the data-access boundary, and do not add official game artwork or proprietary assets.

Before proposing a change, run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. Add a Prisma migration for schema changes and tests for validation or ordering changes. UI changes should remain keyboard accessible, responsive, high contrast, and usable without character portraits.
