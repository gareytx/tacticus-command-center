import "./server-only";
import { TacticusError } from "./errors";
import { parsePlayerState } from "./schemas";
import type { TacticusApiClient } from "./types";

export const TACTICUS_PLAYER_ENDPOINT =
  "https://api.tacticusgame.com/api/v1/player";
type FetchLike = typeof fetch;

function requestId(response: Response) {
  return (
    response.headers.get("x-request-id") ??
    response.headers.get("x-correlation-id") ??
    undefined
  );
}

function retryAfter(response: Response) {
  const raw = response.headers.get("retry-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
  const date = Date.parse(raw);
  return Number.isNaN(date)
    ? undefined
    : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

export class OfficialTacticusApiClient implements TacticusApiClient {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 10_000,
  ) {}

  async getPlayerState(apiKey: string) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(TACTICUS_PLAYER_ENDPOINT, {
          method: "GET",
          headers: { Accept: "application/json", "X-API-KEY": apiKey },
          cache: "no-store",
          signal: controller.signal,
        });
        const common = { requestId: requestId(response) };
        if (response.status === 401)
          throw new TacticusError("INVALID_KEY", common);
        if (response.status === 403)
          throw new TacticusError("MISSING_PLAYER_SCOPE", common);
        if (response.status === 429)
          throw new TacticusError("RATE_LIMITED", {
            ...common,
            retryAfterSeconds: retryAfter(response),
          });
        if (response.status >= 500) {
          if (attempt === 0) continue;
          throw new TacticusError("API_UNAVAILABLE", common);
        }
        if (!response.ok) throw new TacticusError("UNKNOWN_UPSTREAM", common);
        let raw: unknown;
        try {
          raw = await response.json();
        } catch {
          throw new TacticusError("MALFORMED_RESPONSE", common);
        }
        return parsePlayerState(raw);
      } catch (error) {
        if (error instanceof TacticusError) throw error;
        if (
          error instanceof Error &&
          (error.name === "AbortError" || controller.signal.aborted)
        )
          throw new TacticusError("TIMEOUT");
        throw new TacticusError("API_UNAVAILABLE");
      } finally {
        clearTimeout(timer);
      }
    }
    throw new TacticusError("API_UNAVAILABLE");
  }
}
