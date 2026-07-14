import { TacticusError } from "./errors";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function assertLocalIntegrationRequest(request: Request) {
  const url = new URL(request.url);
  if (!LOOPBACK.has(url.hostname)) throw new TacticusError("UNKNOWN_UPSTREAM");
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== url.host)
    throw new TacticusError("UNKNOWN_UPSTREAM");
}
