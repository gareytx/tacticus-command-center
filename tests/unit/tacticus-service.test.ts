/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => {
  type Row = Record<string, any>;
  const state = {
    connections: [] as Row[],
    pending: [] as Row[],
    runs: [] as Row[],
    sequence: 0,
  };
  const withId = (data: Row, prefix: string) => ({
    id: `${prefix}-${++state.sequence}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  });
  const db: any = {
    tacticusConnection: {
      findFirst: vi.fn(async (args?: Row) => {
        const row = state.connections[0] ?? null;
        if (!row) return null;
        return args?.include?.syncRuns
          ? {
              ...row,
              syncRuns: [...state.runs]
                .sort((a, b) => +b.startedAt - +a.startedAt)
                .slice(0, 5),
            }
          : row;
      }),
      findUnique: vi.fn(
        async ({ where }: Row) =>
          state.connections.find(
            (item) => item.keyFingerprint === where.keyFingerprint,
          ) ?? null,
      ),
      create: vi.fn(async ({ data }: Row) => {
        if (
          state.connections.some(
            (item) => item.keyFingerprint === data.keyFingerprint,
          )
        )
          throw new Error("unique");
        const row = withId(
          {
            status: "CONNECTED",
            externalPlayerId: null,
            lastAttemptedSyncAt: null,
            lastSuccessfulSyncAt: null,
            lastErrorCode: null,
            lastErrorMessage: null,
            ...data,
          },
          "connection",
        );
        state.connections.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: Row) => {
        const index = state.connections.findIndex(
          (item) => item.id === where.id,
        );
        state.connections[index] = {
          ...state.connections[index],
          ...data,
          updatedAt: new Date(),
        };
        return state.connections[index];
      }),
      deleteMany: vi.fn(async () => {
        const count = state.connections.length;
        state.connections.length = 0;
        state.runs.length = 0;
        return { count };
      }),
    },
    tacticusPendingConnection: {
      findUnique: vi.fn(
        async ({ where }: Row) =>
          state.pending.find(
            (item) =>
              item.confirmationTokenHash === where.confirmationTokenHash,
          ) ?? null,
      ),
      create: vi.fn(async ({ data }: Row) => {
        const row = withId(data, "pending");
        state.pending.push(row);
        return row;
      }),
      delete: vi.fn(async ({ where }: Row) => {
        const index = state.pending.findIndex((item) => item.id === where.id);
        return state.pending.splice(index, 1)[0];
      }),
      deleteMany: vi.fn(async () => {
        const count = state.pending.length;
        state.pending.length = 0;
        return { count };
      }),
    },
    tacticusSyncRun: {
      create: vi.fn(async ({ data }: Row) => {
        const row = withId(
          {
            completedAt: null,
            recordsReceived: 0,
            errorCode: null,
            errorMessage: null,
            ...data,
          },
          "run",
        );
        state.runs.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: Row) => {
        const index = state.runs.findIndex((item) => item.id === where.id);
        state.runs[index] = { ...state.runs[index], ...data };
        return state.runs[index];
      }),
    },
    $transaction: vi.fn(async (input: any) =>
      typeof input === "function" ? input(db) : Promise.all(input),
    ),
  };
  return {
    db,
    state,
    reset() {
      state.connections.length = 0;
      state.pending.length = 0;
      state.runs.length = 0;
      state.sequence = 0;
      vi.clearAllMocks();
    },
  };
});

vi.mock("@/lib/db", () => ({ db: fake.db }));

import {
  cancelPendingTacticusConnection,
  confirmTacticusConnection,
  disconnectTacticusConnection,
  testTacticusConnection,
} from "@/services/tacticus-connection.service";
import { syncTacticusConnection } from "@/services/tacticus-sync.service";
import { TacticusError } from "@/lib/tacticus/errors";
import { parsePlayerState } from "@/lib/tacticus/schemas";
import { validTacticusResponse } from "../helpers/tacticus-response";

const state = () => parsePlayerState(validTacticusResponse());
const client = (value = state()) => ({
  getPlayerState: vi.fn().mockResolvedValue(value),
});

async function connect(apiKey = "test-player-key-one") {
  const preview = await testTacticusConnection(apiKey, { client: client() });
  await confirmTacticusConnection(preview.confirmationToken);
  return preview;
}

describe("Tacticus connection and sync services", () => {
  beforeEach(() => {
    fake.reset();
    process.env.TACTICUS_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(
      32,
      4,
    ).toString("base64");
  });

  it("confirms an initial encrypted local connection", async () => {
    const preview = await testTacticusConnection("test-player-key-one", {
      client: client(),
    });
    expect(fake.state.pending).toHaveLength(1);
    expect(fake.state.pending[0].encryptedApiKey).not.toContain(
      "test-player-key-one",
    );
    await confirmTacticusConnection(preview.confirmationToken);
    expect(fake.state.connections).toHaveLength(1);
    expect(fake.state.pending).toHaveLength(0);
  });
  it("prevents a duplicate key", async () => {
    await connect();
    await expect(
      testTacticusConnection("test-player-key-one", { client: client() }),
    ).rejects.toMatchObject({ code: "DUPLICATE_KEY" });
  });
  it("enforces one active local connection", async () => {
    await connect();
    await expect(
      testTacticusConnection("different-player-key", { client: client() }),
    ).rejects.toMatchObject({ code: "CONNECTION_EXISTS" });
  });
  it("records a successful proof-of-concept sync", async () => {
    await connect();
    const writeFixture = vi.fn().mockResolvedValue("fixture.json");
    const result = await syncTacticusConnection({
      client: client(),
      writeFixture,
    });
    expect(result.status).toBe("SUCCEEDED");
    expect(fake.state.runs.at(-1)?.status).toBe("SUCCEEDED");
    expect(fake.state.connections[0].lastSuccessfulSyncAt).toBeInstanceOf(Date);
    expect(writeFixture).toHaveBeenCalledOnce();
  });
  it("records a failed sync with a safe error", async () => {
    await connect();
    const failing = {
      getPlayerState: vi.fn().mockRejectedValue(new TacticusError("TIMEOUT")),
    };
    await expect(
      syncTacticusConnection({ client: failing }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(fake.state.runs.at(-1)).toMatchObject({
      status: "FAILED",
      errorCode: "TIMEOUT",
    });
    expect(fake.state.connections[0]).toMatchObject({
      status: "ERROR",
      lastErrorCode: "TIMEOUT",
    });
  });
  it("rejects an account identity mismatch", async () => {
    await connect();
    const changed = validTacticusResponse();
    changed.player.details.name = "Different Commander";
    await expect(
      syncTacticusConnection({
        client: client(parsePlayerState(changed)),
        writeFixture: vi.fn(),
      }),
    ).rejects.toMatchObject({ code: "ACCOUNT_MISMATCH" });
    expect(fake.state.runs.at(-1)?.status).toBe("FAILED");
  });
  it("deletes encrypted credentials and pending state on disconnect", async () => {
    await connect();
    await disconnectTacticusConnection();
    expect(fake.state.connections).toHaveLength(0);
    expect(fake.state.pending).toHaveLength(0);
  });
  it("cancels pending confirmation without creating a connection", async () => {
    await testTacticusConnection("test-player-key-one", { client: client() });
    await cancelPendingTacticusConnection();
    expect(fake.state.pending).toHaveLength(0);
    expect(fake.state.connections).toHaveLength(0);
  });
  it("does not persist pending state when upstream validation fails", async () => {
    const malformed = {
      getPlayerState: vi
        .fn()
        .mockRejectedValue(new TacticusError("MALFORMED_RESPONSE")),
    };
    await expect(
      testTacticusConnection("test-player-key-one", { client: malformed }),
    ).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
    expect(fake.state.pending).toHaveLength(0);
    expect(fake.state.connections).toHaveLength(0);
  });
});
