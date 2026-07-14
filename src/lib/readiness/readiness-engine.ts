export type ReadinessCharacter = {
  id: string;
  name: string;
  slug: string;
  alliance: string;
  priority: string;
  investmentStatus: string;
  unitType: string;
  shardsOwned: number | null;
  shardsRequired: number | null;
  characterLevel: number | null;
  rank: string | null;
  activeGoal: boolean;
};

export type Opportunity = {
  key: string;
  characterId: string;
  characterSlug: string;
  characterName: string;
  unitType: string;
  alliance: string;
  priority: string;
  type: "SHARD" | "LEVEL" | "RANK" | "ABILITY";
  status: "READY" | "BLOCKED" | "UNKNOWN";
  confidence: "EXACT" | "INSUFFICIENT_DATA";
  summary: string;
  required: number | null;
  owned: number | null;
  missing: number | null;
  score: number;
};

const PRIORITY: Record<string, number> = {
  CRITICAL: 500,
  HIGH: 400,
  MEDIUM: 300,
  LOW: 200,
  HOLD: 100,
};
const INVESTMENT: Record<string, number> = {
  INVEST_NOW: 80,
  CAMPAIGN_PRIORITY: 60,
  GUILD_RAID_PRIORITY: 60,
  ARENA_PRIORITY: 60,
  EVENT_PRIORITY: 60,
  MAINTAIN: 20,
  IGNORE_FOR_NOW: 0,
};

export function priorityScore(
  c: ReadinessCharacter,
  status: Opportunity["status"],
  missing: number | null,
) {
  const gap = missing === null ? 0 : Math.max(0, 20 - Math.min(20, missing));
  return (
    (PRIORITY[c.priority] ?? 0) +
    (INVESTMENT[c.investmentStatus] ?? 0) +
    (status === "READY" ? 30 : status === "BLOCKED" ? 20 : 0) +
    (c.activeGoal ? 25 : 0) +
    gap
  );
}

export function evaluateReadiness(c: ReadinessCharacter): Opportunity[] {
  const shardKnown =
    c.shardsOwned !== null && c.shardsRequired !== null && c.shardsRequired > 0;
  const missing = shardKnown
    ? Math.max(0, c.shardsRequired! - c.shardsOwned!)
    : null;
  const status: Opportunity["status"] = !shardKnown
    ? "UNKNOWN"
    : missing === 0
      ? "READY"
      : "BLOCKED";
  const shard: Opportunity = {
    key: `${c.id}:SHARD`,
    characterId: c.id,
    characterSlug: c.slug,
    characterName: c.name,
    unitType: c.unitType,
    alliance: c.alliance,
    priority: c.priority,
    type: "SHARD",
    status,
    confidence: shardKnown ? "EXACT" : "INSUFFICIENT_DATA",
    summary: shardKnown
      ? status === "READY"
        ? "Local shard threshold is met."
        : `${missing} more shards needed for the local threshold.`
      : "Shard total is known, but no verified next threshold is available.",
    required: c.shardsRequired,
    owned: c.shardsOwned,
    missing,
    score: priorityScore(c, status, missing),
  };
  const unknown = (["LEVEL", "RANK", "ABILITY"] as const).map((type) => ({
    key: `${c.id}:${type}`,
    characterId: c.id,
    characterSlug: c.slug,
    characterName: c.name,
    unitType: c.unitType,
    alliance: c.alliance,
    priority: c.priority,
    type,
    status: "UNKNOWN" as const,
    confidence: "INSUFFICIENT_DATA" as const,
    summary: `${type.toLowerCase()} costs are not present in the official player payload.`,
    required: null,
    owned: null,
    missing: null,
    score: priorityScore(c, "UNKNOWN", null),
  }));
  return [shard, ...unknown];
}
