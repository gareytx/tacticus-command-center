import "./server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { redactCredential } from "./redaction";
import { TacticusError } from "./errors";

const SENSITIVE_KEY =
  /(^|[-_])(email|playerId|userId|accountId|guildId|deviceId|apiKey|authorization|authentication|credential|token|tokens|accessToken|refreshToken)([-_]|$)/i;

function sanitizeNode(value: unknown, pathParts: string[] = []): unknown {
  if (Array.isArray(value))
    return value.map((item, index) =>
      sanitizeNode(item, [...pathParts, String(index)]),
    );
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => {
        const nextPath = [...pathParts, key];
        const isPlayerName = nextPath.join(".") === "player.details.name";
        return [
          key,
          SENSITIVE_KEY.test(key) || isPlayerName
            ? "[REDACTED]"
            : sanitizeNode(child, nextPath),
        ];
      }),
    );
  }
  return value;
}

export function sanitizePlayerState(value: unknown, secrets: string[] = []) {
  const sanitized = sanitizeNode(value);
  const serialized = JSON.stringify(sanitized);
  if (
    secrets.some((secret) => secret && serialized.includes(secret)) ||
    /authorization\s*[:=]|x-api-key\s*[:=]/i.test(serialized)
  )
    throw new TacticusError("MALFORMED_RESPONSE");
  return sanitized;
}

export async function writeSanitizedFixture(
  value: unknown,
  secrets: string[] = [],
) {
  const sanitized = sanitizePlayerState(value, secrets);
  const target = path.join(
    process.cwd(),
    "test",
    "fixtures",
    "tacticus",
    "player-state.sanitized.json",
  );
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(
    target,
    `${redactCredential(JSON.stringify(sanitized, null, 2), secrets)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  return target;
}
