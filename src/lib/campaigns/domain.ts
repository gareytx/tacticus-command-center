import { z } from "zod";

export const campaignSyncSchema = z.object({
  externalKey: z.string().min(1),
  externalCampaignId: z.string().min(1),
  displayName: z.string().min(1),
  upstreamType: z.string().min(1),
  normalizedType: z.enum(["STANDARD", "MIRROR", "ELITE", "EVENT", "UNKNOWN"]),
  typeSource: z.string().min(1),
  confidence: z.string().min(1),
  semanticStatus: z.enum(["VERIFIED", "PARTIAL", "UNKNOWN", "UNSUPPORTED"]),
  isActive: z.boolean().nullable(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  battles: z.array(
    z
      .object({
        battleIndex: z.number().int(),
        attemptsLeft: z.number().int().min(0),
        attemptsUsed: z.number().int().min(0),
      })
      .passthrough(),
  ),
  metadata: z.record(z.string(), z.unknown()),
});

export type CampaignSync = z.infer<typeof campaignSyncSchema>;

const VERIFIED_EVENT_IDS = new Set(["eventCampaign6"]);

export function normalizeCampaigns(value: unknown[]): CampaignSync[] {
  return value.map((raw) => {
    const item = raw as Record<string, unknown>;
    const id = String(item.id ?? "").trim();
    const upstreamType = String(item.type ?? "Unknown").trim() || "Unknown";
    const knownEvent = VERIFIED_EVENT_IDS.has(id);
    const normalizedType = knownEvent
      ? "EVENT"
      : upstreamType === "Standard"
        ? "STANDARD"
        : upstreamType === "Mirror"
          ? "MIRROR"
          : upstreamType === "Elite" || upstreamType === "EliteMirror"
            ? "ELITE"
            : "UNKNOWN";
    const upstreamName = typeof item.name === "string" ? item.name.trim() : "";
    const battles = Array.isArray(item.battles) ? item.battles : [];
    return campaignSyncSchema.parse({
      externalKey: `${id}::${upstreamType}`,
      externalCampaignId: id,
      displayName: upstreamName || `Campaign event ${id} (${upstreamType})`,
      upstreamType,
      normalizedType,
      typeSource: knownEvent
        ? "VERIFIED_FIXTURE_MAPPING"
        : normalizedType === "UNKNOWN"
          ? "UNKNOWN"
          : "API_TYPE",
      confidence: normalizedType === "UNKNOWN" ? "UNKNOWN" : "HIGH",
      semanticStatus: normalizedType === "UNKNOWN" ? "UNKNOWN" : "PARTIAL",
      isActive: null,
      startsAt: null,
      endsAt: null,
      battles,
      metadata: Object.fromEntries(
        Object.entries(item).filter(([key]) => key !== "battles"),
      ),
    });
  });
}

export type BlockerEvidence =
  "EXACT" | "INFERRED" | "MANUAL" | "INSUFFICIENT_DATA";

export function evaluateCampaignBlockers(input: {
  manualBlocker?: string | null;
  team?: {
    teamMembers: Array<{
      character: {
        name: string;
        isOwned: boolean;
        upgradeGoals: Array<{ status: string }>;
      };
    }>;
  } | null;
}) {
  const blockers: Array<{ evidence: BlockerEvidence; label: string }> = [];
  if (input.manualBlocker?.trim())
    blockers.push({ evidence: "MANUAL", label: input.manualBlocker.trim() });
  for (const member of input.team?.teamMembers ?? []) {
    if (!member.character.isOwned)
      blockers.push({
        evidence: "EXACT",
        label: `Assigned unit not owned: ${member.character.name}`,
      });
    else if (
      member.character.upgradeGoals.some((goal) =>
        ["PLANNED", "IN_PROGRESS", "BLOCKED"].includes(goal.status),
      )
    )
      blockers.push({
        evidence: "INFERRED",
        label: `Assigned unit has an active local upgrade goal: ${member.character.name}`,
      });
  }
  if (!blockers.length)
    blockers.push({
      evidence: "INSUFFICIENT_DATA",
      label: "Campaign requirements are not available from the Player API.",
    });
  return blockers;
}

const PRIORITY_WEIGHT: Record<string, number> = {
  CRITICAL: 50,
  HIGH: 40,
  MEDIUM: 30,
  LOW: 20,
  HOLD: 0,
};

export function campaignPriorityScore(
  input: {
    priority?: string;
    status?: string;
    targetDate?: Date | null;
    isActive?: boolean | null;
    blockerCount?: number;
  },
  now = new Date(),
) {
  let score = PRIORITY_WEIGHT[input.priority ?? "MEDIUM"] ?? 30;
  if (input.status === "ACTIVE") score += 15;
  if (input.isActive === true) score += 10;
  if (input.blockerCount) score += Math.min(input.blockerCount * 5, 15);
  if (input.targetDate) {
    const days = Math.ceil(
      (input.targetDate.getTime() - now.getTime()) / 86_400_000,
    );
    if (days <= 0) score += 20;
    else if (days <= 7) score += 15;
    else if (days <= 30) score += 8;
  }
  return Math.max(0, Math.min(100, score));
}
