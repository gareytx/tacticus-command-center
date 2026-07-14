import { describe, expect, it, vi } from "vitest";
import {
  OfficialTacticusApiClient,
  TACTICUS_PLAYER_ENDPOINT,
} from "@/lib/tacticus/client";
import { validTacticusResponse } from "../helpers/tacticus-response";

function expectCode(promise: Promise<unknown>, code: string) {
  return expect(promise).rejects.toMatchObject({ code });
}

describe("official Tacticus API client", () => {
  it("uses the documented endpoint and X-API-KEY header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(validTacticusResponse()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await new OfficialTacticusApiClient(fetchMock).getPlayerState(
      "test-player-key",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      TACTICUS_PLAYER_ENDPOINT,
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json", "X-API-KEY": "test-player-key" },
      }),
    );
  });
  it("maps 401 safely", () =>
    expectCode(
      new OfficialTacticusApiClient(
        vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
      ).getPlayerState("test-key-value"),
      "INVALID_KEY",
    ));
  it("maps 403 safely", () =>
    expectCode(
      new OfficialTacticusApiClient(
        vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
      ).getPlayerState("test-key-value"),
      "MISSING_PLAYER_SCOPE",
    ));
  it("maps 429 and Retry-After safely", async () => {
    const promise = new OfficialTacticusApiClient(
      vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 429, headers: { "Retry-After": "60" } }),
        ),
    ).getPlayerState("test-key-value");
    await expect(promise).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryAfterSeconds: 60,
    });
  });
  it("times out explicitly", async () => {
    const fetchMock = vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) =>
          options?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          }),
        ),
    );
    await expectCode(
      new OfficialTacticusApiClient(
        fetchMock as typeof fetch,
        5,
      ).getPlayerState("test-key-value"),
      "TIMEOUT",
    );
  });
  it("retries one 500 response and then fails safely", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 500 }));
    await expectCode(
      new OfficialTacticusApiClient(fetchMock).getPlayerState("test-key-value"),
      "API_UNAVAILABLE",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("rejects malformed JSON", () =>
    expectCode(
      new OfficialTacticusApiClient(
        vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })),
      ).getPlayerState("test-key-value"),
      "MALFORMED_RESPONSE",
    ));
  it("rejects valid JSON with an invalid schema", () =>
    expectCode(
      new OfficialTacticusApiClient(
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ player: {} }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ).getPlayerState("test-key-value"),
      "MALFORMED_RESPONSE",
    ));
  it("accepts unknown fields and missing optional fields", async () => {
    const raw = validTacticusResponse({ futureTopLevel: true });
    Reflect.deleteProperty(raw.metaData, "apiKeyExpiresOn");
    const result = await new OfficialTacticusApiClient(
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(raw), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ).getPlayerState("test-key-value");
    expect(result.futureTopLevel).toBe(true);
  });
});
