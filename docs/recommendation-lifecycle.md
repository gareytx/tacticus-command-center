# Recommendation lifecycle

Recommendations move through `ACTIVE`, `SNOOZED`, `DISMISSED`, `COMPLETED`, `STALE`, and `SUPERSEDED`. A stable lifecycle key identifies an advisor/type/target relationship; a SHA-256 fingerprint includes the material structured evidence and relevant strategy state.

Identical regeneration updates the existing record and preserves dismissal, completion, or an unexpired snooze. Material evidence changes supersede the old record and create a new active fingerprint. Candidates no longer reproduced become stale. Feedback is append-only and never changes scoring implicitly.

The explicit rebuild command is `npm run db:backfill-recommendations`. The invariant audit is `npm run audit:recommendations`.
