import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { createHash } from "node:crypto";

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split(/\r?\n/)
  .filter(Boolean);
const binary = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".db",
  ".sqlite",
  ".zip",
  ".woff",
  ".woff2",
]);
const likelySecret = [
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /authorization\s*[:=]\s*bearer\s+[A-Za-z0-9._~+/-]{16,}/i,
  /TACTICUS_CREDENTIAL_ENCRYPTION_KEY\s*=\s*["']?(?!<)[A-Za-z0-9+/]{40,}={0,2}/,
];
const configuredKey = process.env.TACTICUS_CREDENTIAL_ENCRYPTION_KEY;
const fingerprint =
  configuredKey && !configuredKey.includes("<")
    ? createHash("sha256").update(configuredKey).digest("hex").slice(0, 16)
    : null;
const violations: string[] = [];
for (const file of files) {
  if (binary.has(extname(file).toLowerCase())) continue;
  let contents: string;
  try {
    contents = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (
    likelySecret.some((pattern) => pattern.test(contents)) ||
    (fingerprint && contents.includes(fingerprint))
  )
    violations.push(file);
}

const fixturePath = "test/fixtures/tacticus/player-state.sanitized.json";
if (files.includes(fixturePath)) {
  const fixtureText = readFileSync(fixturePath, "utf8");
  const fixture = JSON.parse(fixtureText) as Record<string, unknown>;
  const sensitiveKey =
    /(^|[-_])(email|playerId|userId|accountId|guildId|deviceId|apiKey|authorization|authentication|credential|token|tokens|accessToken|refreshToken)([-_]|$)/i;
  const inspectFixture = (value: unknown, path: string[] = []) => {
    if (Array.isArray(value)) {
      value.forEach((child, index) =>
        inspectFixture(child, [...path, String(index)]),
      );
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      const nextPath = [...path, key];
      const isPlayerName = nextPath.join(".") === "player.details.name";
      if ((sensitiveKey.test(key) || isPlayerName) && child !== "[REDACTED]")
        violations.push(`${fixturePath}:${nextPath.join(".")}`);
      inspectFixture(child, nextPath);
    }
  };
  inspectFixture(fixture);
  if (
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(fixtureText) ||
    /authorization\s*[:=]|x-api-key\s*[:=]|bearer\s+[A-Za-z0-9._~+/-]{8,}/i.test(
      fixtureText,
    ) ||
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(
      fixtureText,
    )
  )
    violations.push(`${fixturePath}:sensitive-value-pattern`);
}
if (violations.length) {
  process.stderr.write(
    `Potential credential material detected in: ${[...new Set(violations)].join(", ")}\n`,
  );
  process.exit(1);
}
process.stdout.write(
  `Secret scan passed for ${files.length} tracked and untracked project files.\n`,
);
