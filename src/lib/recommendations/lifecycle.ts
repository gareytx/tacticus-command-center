export const FRESHNESS_MS = 48 * 60 * 60 * 1000;
export const REVIEW_HORIZON_MS = 7 * 24 * 60 * 60 * 1000;
export function isSourceStale(lastSync: Date | null, now: Date) {
  return !lastSync || now.getTime() - lastSync.getTime() > FRESHNESS_MS;
}
export function snoozeUntil(action: string, now: Date) {
  const d = new Date(now);
  if (action === "SNOOZE_TOMORROW") {
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d;
  }
  const days = action === "SNOOZE_3_DAYS" ? 3 : 7;
  return new Date(now.getTime() + days * 86_400_000);
}
export function visibleForBudget(category: string, budget: number) {
  if (budget <= 10) return ["QUICK_REVIEW"].includes(category);
  if (budget <= 20) return ["QUICK_REVIEW", "SHORT_ACTION"].includes(category);
  if (budget <= 45) return category !== "LONG_TERM_PLAN";
  return true;
}
