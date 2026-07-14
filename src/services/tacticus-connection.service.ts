import "@/lib/tacticus/server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { OfficialTacticusApiClient } from "@/lib/tacticus/client";
import {
  encryptCredential,
  fingerprintApiKey,
  hashConfirmationToken,
} from "@/lib/tacticus/encryption";
import { TacticusError } from "@/lib/tacticus/errors";
import { maskIdentity } from "@/lib/tacticus/redaction";
import { summarizePlayerState } from "@/lib/tacticus/schemas";
import type { TacticusApiClient } from "@/lib/tacticus/types";

const apiKeySchema = z.string().trim().min(12).max(512);
const confirmationSchema = z.string().min(32).max(256);
const PENDING_TTL_MS = 10 * 60 * 1000;

export interface ConnectionServiceDependencies {
  client?: TacticusApiClient;
  now?: () => Date;
}

export async function testTacticusConnection(
  apiKeyInput: unknown,
  dependencies: ConnectionServiceDependencies = {},
) {
  const parsed = apiKeySchema.safeParse(apiKeyInput);
  if (!parsed.success) throw new TacticusError("INVALID_KEY");
  const apiKey = parsed.data;
  const now = dependencies.now?.() ?? new Date();
  const fingerprint = fingerprintApiKey(apiKey);
  const [connection, duplicate] = await Promise.all([
    db.tacticusConnection.findFirst({ select: { id: true } }),
    db.tacticusConnection.findUnique({
      where: { keyFingerprint: fingerprint },
      select: { id: true },
    }),
  ]);
  if (duplicate) throw new TacticusError("DUPLICATE_KEY");
  if (connection) throw new TacticusError("CONNECTION_EXISTS");
  const state = await (
    dependencies.client ?? new OfficialTacticusApiClient()
  ).getPlayerState(apiKey);
  const summary = summarizePlayerState(state, now);
  const encrypted = encryptCredential(apiKey);
  const confirmationToken = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.tacticusPendingConnection.deleteMany(),
    db.tacticusPendingConnection.create({
      data: {
        encryptedApiKey: encrypted.ciphertext,
        encryptionIv: encrypted.iv,
        encryptionAuthTag: encrypted.authTag,
        encryptionVersion: encrypted.version,
        keyFingerprint: fingerprint,
        confirmationTokenHash: hashConfirmationToken(confirmationToken),
        externalPlayerName: summary.playerName,
        scopesJson: JSON.stringify(summary.scopes),
        upstreamLastUpdatedAt: summary.upstreamLastUpdatedAt,
        unitCount: summary.unitCount,
        inventoryRecordCount: summary.inventoryRecordCount,
        expiresAt: new Date(now.getTime() + PENDING_TTL_MS),
      },
    }),
  ]);
  return {
    confirmationToken,
    playerName: summary.playerName,
    maskedPlayerId: maskIdentity(null),
    powerLevel: summary.powerLevel,
    unitCount: summary.unitCount,
    inventoryRecordCount: summary.inventoryRecordCount,
    upstreamLastUpdatedAt: summary.upstreamLastUpdatedAt.toISOString(),
    stale: summary.stale,
  };
}

export async function confirmTacticusConnection(
  tokenInput: unknown,
  now = new Date(),
) {
  const parsed = confirmationSchema.safeParse(tokenInput);
  if (!parsed.success) throw new TacticusError("PENDING_EXPIRED");
  const pending = await db.tacticusPendingConnection.findUnique({
    where: { confirmationTokenHash: hashConfirmationToken(parsed.data) },
  });
  if (!pending || pending.expiresAt <= now) {
    if (pending)
      await db.tacticusPendingConnection.delete({ where: { id: pending.id } });
    throw new TacticusError("PENDING_EXPIRED");
  }
  try {
    const connection = await db.$transaction(async (tx) => {
      if (await tx.tacticusConnection.findFirst({ select: { id: true } }))
        throw new TacticusError("CONNECTION_EXISTS");
      const created = await tx.tacticusConnection.create({
        data: {
          encryptedApiKey: pending.encryptedApiKey,
          encryptionIv: pending.encryptionIv,
          encryptionAuthTag: pending.encryptionAuthTag,
          encryptionVersion: pending.encryptionVersion,
          keyFingerprint: pending.keyFingerprint,
          externalPlayerName: pending.externalPlayerName,
          scopesJson: pending.scopesJson,
          upstreamLastUpdatedAt: pending.upstreamLastUpdatedAt,
          status: "CONNECTED",
        },
      });
      await tx.tacticusPendingConnection.deleteMany();
      return created;
    });
    return { connected: true, playerName: connection.externalPlayerName };
  } catch (error) {
    if (error instanceof TacticusError) throw error;
    throw new TacticusError("DUPLICATE_KEY");
  }
}

export async function getTacticusConnectionStatus() {
  const connection = await db.tacticusConnection.findFirst({
    include: { syncRuns: { orderBy: { startedAt: "desc" }, take: 5 } },
  });
  if (!connection) return { connected: false as const };
  return {
    connected: true as const,
    playerName: connection.externalPlayerName,
    maskedPlayerId: maskIdentity(connection.externalPlayerId),
    status: connection.status,
    lastAttemptedSyncAt: connection.lastAttemptedSyncAt?.toISOString() ?? null,
    lastSuccessfulSyncAt:
      connection.lastSuccessfulSyncAt?.toISOString() ?? null,
    upstreamLastUpdatedAt:
      connection.upstreamLastUpdatedAt?.toISOString() ?? null,
    keyFingerprint: connection.keyFingerprint,
    lastErrorCode: connection.lastErrorCode,
    lastErrorMessage: connection.lastErrorMessage,
    syncRuns: connection.syncRuns.map((run) => ({
      id: run.id,
      status: run.status,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      recordsReceived: run.recordsReceived,
      errorMessage: run.errorMessage,
    })),
  };
}

export async function disconnectTacticusConnection() {
  await db.$transaction([
    db.tacticusPendingConnection.deleteMany(),
    db.tacticusConnection.deleteMany(),
  ]);
  return { disconnected: true };
}

export async function cancelPendingTacticusConnection() {
  await db.tacticusPendingConnection.deleteMany();
  return { cancelled: true };
}
