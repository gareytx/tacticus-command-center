import { TacticusError, toSafeTacticusError } from "@/lib/tacticus/errors";
import { assertLocalIntegrationRequest } from "@/lib/tacticus/request-security";

export async function safeIntegrationRoute(
  request: Request,
  handler: () => Promise<unknown>,
) {
  try {
    assertLocalIntegrationRequest(request);
    return Response.json(await handler());
  } catch (error) {
    const safe = toSafeTacticusError(error);
    const status =
      safe.code === "RATE_LIMITED" || safe.code === "SYNC_COOLDOWN"
        ? 429
        : safe.code === "SYNC_IN_PROGRESS" ||
            safe.code === "CONNECTION_EXISTS" ||
            safe.code === "DUPLICATE_KEY"
          ? 409
          : safe.code === "API_UNAVAILABLE" || safe.code === "TIMEOUT"
            ? 503
            : 400;
    return Response.json(
      {
        ok: false,
        code: safe.code,
        message: safe.message,
        retryAfterSeconds: safe.retryAfterSeconds,
      },
      { status },
    );
  }
}

export function invalidBody() {
  throw new TacticusError("UNKNOWN_UPSTREAM");
}
