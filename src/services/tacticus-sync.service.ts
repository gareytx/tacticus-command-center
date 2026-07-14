import "@/lib/tacticus/server-only";
import { db } from "@/lib/db";
import { OfficialTacticusApiClient } from "@/lib/tacticus/client";
import { decryptCredential } from "@/lib/tacticus/encryption";
import { TacticusError, toSafeTacticusError } from "@/lib/tacticus/errors";
import { summarizePlayerState } from "@/lib/tacticus/schemas";
import { writeSanitizedFixture } from "@/lib/tacticus/sanitize";
import type { TacticusApiClient } from "@/lib/tacticus/types";

const COOLDOWN_MS = 30_000;

export async function syncTacticusConnection(
  dependencies: {
    client?: TacticusApiClient;
    now?: () => Date;
    writeFixture?: typeof writeSanitizedFixture;
  } = {},
) {
  const now = dependencies.now?.() ?? new Date();
  const connection = await db.tacticusConnection.findFirst();
  if (!connection) throw new TacticusError("UNKNOWN_UPSTREAM");
  if (connection.status === "SYNCING")
    throw new TacticusError("SYNC_IN_PROGRESS");
  if (
    connection.lastAttemptedSyncAt &&
    now.getTime() - connection.lastAttemptedSyncAt.getTime() < COOLDOWN_MS
  )
    throw new TacticusError("SYNC_COOLDOWN");
  const run = await db.$transaction(async (tx) => {
    await tx.tacticusConnection.update({
      where: { id: connection.id },
      data: {
        status: "SYNCING",
        lastAttemptedSyncAt: now,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
    return tx.tacticusSyncRun.create({
      data: { connectionId: connection.id, status: "RUNNING", startedAt: now },
    });
  });
  try {
    const apiKey = decryptCredential({
      ciphertext: connection.encryptedApiKey,
      iv: connection.encryptionIv,
      authTag: connection.encryptionAuthTag,
      version: connection.encryptionVersion as 1,
    });
    const state = await (
      dependencies.client ?? new OfficialTacticusApiClient()
    ).getPlayerState(apiKey);
    const summary = summarizePlayerState(state, now);
    if (
      connection.externalPlayerName &&
      connection.externalPlayerName !== summary.playerName
    )
      throw new TacticusError("ACCOUNT_MISMATCH");
    await (dependencies.writeFixture ?? writeSanitizedFixture)(state, [
      apiKey,
      connection.keyFingerprint,
    ]);
    await db.$transaction([
      db.tacticusSyncRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCEEDED",
          completedAt: new Date(),
          upstreamLastUpdatedAt: summary.upstreamLastUpdatedAt,
          responseSchemaVersion: summary.responseSchemaVersion,
          recordsReceived: summary.recordsReceived,
        },
      }),
      db.tacticusConnection.update({
        where: { id: connection.id },
        data: {
          status: "CONNECTED",
          upstreamLastUpdatedAt: summary.upstreamLastUpdatedAt,
          lastSuccessfulSyncAt: new Date(),
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      }),
    ]);
    return {
      status: "SUCCEEDED" as const,
      playerName: summary.playerName,
      unitCount: summary.unitCount,
      inventoryRecordCount: summary.inventoryRecordCount,
      recordsReceived: summary.recordsReceived,
      upstreamLastUpdatedAt: summary.upstreamLastUpdatedAt.toISOString(),
      fixtureGenerated: true,
    };
  } catch (error) {
    const safe = toSafeTacticusError(error);
    await db.$transaction([
      db.tacticusSyncRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorCode: safe.code,
          errorMessage: safe.message,
        },
      }),
      db.tacticusConnection.update({
        where: { id: connection.id },
        data: {
          status: "ERROR",
          lastErrorCode: safe.code,
          lastErrorMessage: safe.message,
        },
      }),
    ]);
    throw safe;
  }
}
