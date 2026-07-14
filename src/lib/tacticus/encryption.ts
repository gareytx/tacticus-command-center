import "./server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { TacticusError } from "./errors";

export interface EncryptedCredential {
  ciphertext: string;
  iv: string;
  authTag: string;
  version: 1;
}

export function decodeEncryptionKey(
  encoded = process.env.TACTICUS_CREDENTIAL_ENCRYPTION_KEY,
) {
  if (!encoded || encoded.includes("<"))
    throw new TacticusError("CONFIGURATION_ERROR");
  let key: Buffer;
  try {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
      throw new Error("Invalid base64");
    key = Buffer.from(encoded, "base64");
  } catch {
    throw new TacticusError("CONFIGURATION_ERROR");
  }
  if (key.length !== 32) throw new TacticusError("CONFIGURATION_ERROR");
  return key;
}

export function encryptCredential(
  apiKey: string,
  key = decodeEncryptionKey(),
): EncryptedCredential {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    version: 1,
  };
}

export function decryptCredential(
  value: EncryptedCredential,
  key = decodeEncryptionKey(),
) {
  try {
    if (value.version !== 1) throw new Error("Unsupported encryption version");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(value.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(value.authTag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new TacticusError("CONFIGURATION_ERROR");
  }
}

export function fingerprintApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey, "utf8").digest("hex").slice(0, 16);
}

export function hashConfirmationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
