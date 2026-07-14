import { z } from "zod";

export const eventSyncSchema = z.object({
  externalKey: z.string().min(1),
  externalEventId: z.string().min(1),
  displayName: z.string().min(1),
  eventType: z.enum([
    "LEGENDARY_EVENT",
    "CAMPAIGN_EVENT",
    "QUEST",
    "SURVIVAL",
    "INCURSION",
    "UNKNOWN",
  ]),
  typeSource: z.string().min(1),
  confidence: z.string().min(1),
  semanticStatus: z.enum(["VERIFIED", "PARTIAL", "UNKNOWN", "UNSUPPORTED"]),
  isActive: z.boolean().nullable(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  currentPoints: z.number().int().nullable(),
  currentCurrency: z.number().int().min(0),
  currentShards: z.number().int().min(0),
  currentClaimedChestIndex: z.number().int().min(0),
  lanes: z.array(z.unknown()),
  currentEvent: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()),
});

export type EventSync = z.infer<typeof eventSyncSchema>;

export function normalizeLegendaryEvents(value: unknown[]): EventSync[] {
  return value.map((raw) => {
    const item = raw as Record<string, unknown>;
    const id = String(item.id ?? "").trim();
    const currentEvent =
      item.currentEvent && typeof item.currentEvent === "object"
        ? item.currentEvent
        : null;
    return eventSyncSchema.parse({
      externalKey: `legendary::${id}`,
      externalEventId: id,
      displayName: `Legendary Event · ${id}`,
      eventType: "LEGENDARY_EVENT",
      typeSource: "API_COLLECTION",
      confidence: "HIGH",
      semanticStatus: "PARTIAL",
      isActive: currentEvent !== null,
      startsAt: null,
      endsAt: null,
      currentPoints:
        typeof item.currentPoints === "number" ? item.currentPoints : null,
      currentCurrency: item.currentCurrency,
      currentShards: item.currentShards,
      currentClaimedChestIndex: item.currentClaimedChestIndex,
      lanes: Array.isArray(item.lanes) ? item.lanes : [],
      currentEvent,
      metadata: Object.fromEntries(
        Object.entries(item).filter(
          ([key]) => !["lanes", "currentEvent"].includes(key),
        ),
      ),
    });
  });
}

export function eventProgressSummary(event: EventSync) {
  return {
    currentPoints: event.currentPoints,
    currentCurrency: event.currentCurrency,
    currentShards: event.currentShards,
    currentClaimedChestIndex: event.currentClaimedChestIndex,
    laneCount: event.lanes.length,
    currentStage:
      typeof event.currentEvent?.run === "number"
        ? String(event.currentEvent.run)
        : null,
    tokensCurrent:
      typeof (event.currentEvent?.tokens as Record<string, unknown> | undefined)
        ?.current === "number"
        ? Number(
            (event.currentEvent?.tokens as Record<string, unknown>).current,
          )
        : null,
    tokensMax:
      typeof (event.currentEvent?.tokens as Record<string, unknown> | undefined)
        ?.max === "number"
        ? Number((event.currentEvent?.tokens as Record<string, unknown>).max)
        : null,
    nextTokenInSeconds:
      typeof (event.currentEvent?.tokens as Record<string, unknown> | undefined)
        ?.nextTokenInSeconds === "number"
        ? Number(
            (event.currentEvent?.tokens as Record<string, unknown>)
              .nextTokenInSeconds,
          )
        : null,
    tokenRegenDelay:
      typeof (event.currentEvent?.tokens as Record<string, unknown> | undefined)
        ?.regenDelay === "number"
        ? Number(
            (event.currentEvent?.tokens as Record<string, unknown>).regenDelay,
          )
        : null,
  };
}

export function normalizeOptionalTimestamp(value: unknown): string | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const numeric = Number(value);
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
    : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
