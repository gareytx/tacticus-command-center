import { describe, expect, it } from "vitest";
import {
  decryptCredential,
  encryptCredential,
  fingerprintApiKey,
} from "@/lib/tacticus/encryption";
import {
  maskIdentity,
  redactCredential,
  redactHeaders,
} from "@/lib/tacticus/redaction";
import { sanitizePlayerState } from "@/lib/tacticus/sanitize";

describe("Tacticus credential security", () => {
  const key = Buffer.alloc(32, 7);
  it("round trips AES-256-GCM credentials", () => {
    const encrypted = encryptCredential("player-read-key", key);
    expect(decryptCredential(encrypted, key)).toBe("player-read-key");
    expect(encrypted.ciphertext).not.toContain("player-read-key");
  });
  it("rejects an incorrect encryption key", () => {
    const encrypted = encryptCredential("player-read-key", key);
    expect(() => decryptCredential(encrypted, Buffer.alloc(32, 8))).toThrow();
  });
  it("rejects tampered ciphertext and authentication tags", () => {
    const encrypted = encryptCredential("player-read-key", key);
    expect(() =>
      decryptCredential(
        { ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA` },
        key,
      ),
    ).toThrow();
    expect(() =>
      decryptCredential(
        { ...encrypted, authTag: Buffer.alloc(16, 1).toString("base64") },
        key,
      ),
    ).toThrow();
  });
  it("creates a stable non-reversible truncated fingerprint", () => {
    expect(fingerprintApiKey("same-key")).toBe(fingerprintApiKey("same-key"));
    expect(fingerprintApiKey("same-key")).toMatch(/^[a-f0-9]{16}$/);
    expect(fingerprintApiKey("other-key")).not.toBe(
      fingerprintApiKey("same-key"),
    );
  });
  it("redacts credentials and sensitive headers", () => {
    expect(
      redactCredential("X-API-KEY: secret-value", ["secret-value"]),
    ).not.toContain("secret-value");
    expect(
      redactHeaders({
        "X-API-KEY": "secret-value",
        Accept: "application/json",
      }),
    ).toEqual({ "X-API-KEY": "[REDACTED]", Accept: "application/json" });
  });
  it("masks identifiers", () => {
    expect(maskIdentity("account-12345678")).toBe("••••5678");
    expect(maskIdentity(null)).toBe("Not exposed by API");
  });
  it("sanitizes identity and credential-like fields while retaining structure", () => {
    const value = {
      player: {
        details: { name: "Private Name" },
        units: [{ id: "unit-1", name: "Certus" }],
      },
      userId: "private-user",
      email: "private@example.com",
      nested: { apiKey: "secret-key", optional: null },
    };
    const result = sanitizePlayerState(value, ["secret-key"]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Private Name");
    expect(serialized).not.toContain("private-user");
    expect(serialized).not.toContain("private@example.com");
    expect(serialized).not.toContain("secret-key");
    expect(serialized).toContain("Certus");
    expect(serialized).toContain("optional");
  });
});
