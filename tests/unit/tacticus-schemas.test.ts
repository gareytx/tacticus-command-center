import { describe, expect, it } from "vitest";
import {
  normalizeAlliance,
  normalizeRarity,
  parsePlayerState,
  summarizePlayerState,
  unixSecondsToDate,
} from "@/lib/tacticus/schemas";
import { validTacticusResponse } from "../helpers/tacticus-response";

describe("Tacticus response normalization", () => {
  it("converts Unix timestamp seconds", () =>
    expect(unixSecondsToDate(1_700_000_000).toISOString()).toBe(
      "2023-11-14T22:13:20.000Z",
    ));
  it("rejects malformed timestamps", () =>
    expect(() => unixSecondsToDate(Number.NaN)).toThrow());
  it("validates and summarizes the live Player contract", () => {
    const state = parsePlayerState(validTacticusResponse());
    const summary = summarizePlayerState(
      state,
      new Date("2026-07-14T12:00:00Z"),
    );
    expect(summary.playerName).toBe("Sanitized Commander");
    expect(summary.unitCount).toBe(1);
    expect(summary.inventoryRecordCount).toBe(9);
    expect(summary.responseSchemaVersion).toHaveLength(32);
  });
  it("allows unknown additive fields", () =>
    expect(
      parsePlayerState(
        validTacticusResponse({ futureField: { enabled: true } }),
      ).futureField,
    ).toEqual({ enabled: true }));
  it("supports missing documented optional fields", () => {
    const raw = validTacticusResponse();
    Reflect.deleteProperty(raw.metaData, "apiKeyExpiresOn");
    Reflect.deleteProperty(raw.player.units[0], "name");
    expect(() => parsePlayerState(raw)).not.toThrow();
  });
  it("rejects invalid required identity and timestamps", () => {
    const raw = validTacticusResponse();
    raw.player.details.name = "";
    expect(() => parsePlayerState(raw)).toThrow();
    const timestamp = validTacticusResponse();
    timestamp.metaData.lastUpdatedOn = -1;
    expect(() => parsePlayerState(timestamp)).toThrow();
  });
  it("normalizes future enum values to UNKNOWN", () => {
    expect(normalizeAlliance("TauEmpire")).toBe("UNKNOWN");
    expect(normalizeRarity("Ancient")).toBe("UNKNOWN");
    expect(normalizeRarity("Mythic")).toBe("MYTHIC");
  });
});
