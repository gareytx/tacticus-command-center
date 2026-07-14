export type TacticusErrorCode =
  | "INVALID_KEY"
  | "MISSING_PLAYER_SCOPE"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "API_UNAVAILABLE"
  | "MALFORMED_RESPONSE"
  | "ACCOUNT_MISMATCH"
  | "SYNC_IN_PROGRESS"
  | "SYNC_COOLDOWN"
  | "DUPLICATE_KEY"
  | "CONNECTION_EXISTS"
  | "PENDING_EXPIRED"
  | "PREVIEW_EXPIRED"
  | "CONFIGURATION_ERROR"
  | "UNKNOWN_UPSTREAM";

export const SAFE_ERROR_MESSAGES: Record<TacticusErrorCode, string> = {
  INVALID_KEY: "The API key was not accepted.",
  MISSING_PLAYER_SCOPE: "This key does not have Player read access.",
  RATE_LIMITED:
    "Tacticus temporarily limited synchronization. Please try again later.",
  TIMEOUT: "The Tacticus service did not respond in time.",
  API_UNAVAILABLE: "The Tacticus service is temporarily unavailable.",
  MALFORMED_RESPONSE:
    "Tacticus returned data in a format Command Center does not yet recognize.",
  ACCOUNT_MISMATCH:
    "This key appears to belong to a different Tacticus account.",
  SYNC_IN_PROGRESS: "A Tacticus synchronization is already running.",
  SYNC_COOLDOWN: "Please wait briefly before synchronizing again.",
  DUPLICATE_KEY: "This API key is already connected.",
  CONNECTION_EXISTS:
    "Disconnect the current Tacticus account before connecting another.",
  PENDING_EXPIRED:
    "The account confirmation expired. Test the connection again.",
  PREVIEW_EXPIRED:
    "The synchronization preview expired. Generate a fresh preview before applying.",
  CONFIGURATION_ERROR:
    "Tacticus credential encryption is not configured correctly.",
  UNKNOWN_UPSTREAM: "The Tacticus connection could not be completed safely.",
};

export class TacticusError extends Error {
  constructor(
    public readonly code: TacticusErrorCode,
    options?: {
      retryAfterSeconds?: number;
      requestId?: string;
      cause?: unknown;
    },
  ) {
    super(SAFE_ERROR_MESSAGES[code], { cause: options?.cause });
    this.name = "TacticusError";
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.requestId = options?.requestId;
  }
  readonly retryAfterSeconds?: number;
  readonly requestId?: string;
}

export function toSafeTacticusError(error: unknown) {
  return error instanceof TacticusError
    ? error
    : new TacticusError("UNKNOWN_UPSTREAM");
}
