export type NormalizedAlliance = "IMPERIAL" | "XENOS" | "CHAOS" | "UNKNOWN";
export type NormalizedRarity =
  "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC" | "UNKNOWN";

export interface TacticusPlayerState {
  player: {
    details: { name: string; powerLevel: number; [key: string]: unknown };
    units: unknown[];
    inventory: Record<string, unknown>;
    progress: Record<string, unknown>;
    [key: string]: unknown;
  };
  metaData: {
    configHash: string;
    lastUpdatedOn: number;
    scopes: string[];
    apiKeyExpiresOn?: number | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TacticusStateSummary {
  playerName: string;
  externalPlayerId: null;
  powerLevel: number;
  scopes: string[];
  upstreamLastUpdatedAt: Date;
  responseSchemaVersion: string;
  unitCount: number;
  inventoryRecordCount: number;
  recordsReceived: number;
  stale: boolean;
}

export interface TacticusApiClient {
  getPlayerState(apiKey: string): Promise<TacticusPlayerState>;
}
