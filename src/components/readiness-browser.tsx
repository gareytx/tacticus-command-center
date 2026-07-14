"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, EmptyState, fieldClass, Panel } from "./ui";
import { label } from "@/lib/constants";
import { saveReadinessVerification } from "@/app/readiness/actions";

type Opportunity = {
  key: string;
  characterId: string;
  characterSlug: string;
  characterName: string;
  unitType: string;
  alliance: string;
  priority: string;
  type: string;
  status: string;
  confidence: string;
  summary: string;
  required: number | null;
  owned: number | null;
  missing: number | null;
  score: number;
  verification: string;
  verificationNote: string | null;
};

export function ReadinessBrowser({
  opportunities,
}: {
  opportunities: Opportunity[];
}) {
  const [filters, setFilters] = useState({
    unitType: "CHARACTER",
    alliance: "",
    priority: "",
    status: "",
    confidence: "",
    type: "",
  });
  const results = useMemo(
    () =>
      opportunities.filter((o) =>
        Object.entries(filters).every(
          ([k, v]) => !v || String(o[k as keyof Opportunity]) === v,
        ),
      ),
    [opportunities, filters],
  );
  const select = (key: keyof typeof filters, values: string[]) => (
    <select
      className={fieldClass}
      aria-label={key}
      value={filters[key]}
      onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
    >
      <option value="">All {label(key)}</option>
      {values.map((v) => (
        <option key={v} value={v}>
          {label(v)}
        </option>
      ))}
    </select>
  );
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {select("unitType", ["CHARACTER", "MACHINE_OF_WAR", "UNKNOWN"])}
        {select("alliance", ["IMPERIAL", "CHAOS", "XENOS"])}
        {select("priority", ["CRITICAL", "HIGH", "MEDIUM", "LOW", "HOLD"])}
        {select("status", ["READY", "BLOCKED", "UNKNOWN"])}
        {select("confidence", ["EXACT", "INSUFFICIENT_DATA"])}
        {select("type", ["SHARD", "LEVEL", "RANK", "ABILITY"])}
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        {results.length} opportunities · ordered by strategy priority, not
        combat strength
      </p>
      {!results.length ? (
        <EmptyState
          title="No matching opportunities"
          description="Clear a filter or add a verified local progression threshold."
        />
      ) : (
        <div className="space-y-3">
          {results.map((o) => (
            <Panel key={o.key}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/roster/${o.characterSlug}`}
                    className="font-semibold text-amber-300"
                  >
                    {o.characterName}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-400">{o.summary}</p>
                </div>
                <div className="flex gap-2">
                  <Badge value={o.type} />
                  <Badge value={o.status} />
                  <Badge value={o.confidence} />
                </div>
              </div>
              {o.confidence === "EXACT" && (
                <p className="mt-3 text-xs text-zinc-500">
                  Owned {o.owned} · Required {o.required} · Missing {o.missing}
                </p>
              )}
              <details className="mt-3 border-t border-white/10 pt-3">
                <summary className="cursor-pointer text-xs text-zinc-500">
                  Manual verification: {label(o.verification)}
                </summary>
                <form
                  action={saveReadinessVerification}
                  className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
                >
                  <input type="hidden" name="key" value={o.key} />
                  <input
                    type="hidden"
                    name="characterId"
                    value={o.characterId}
                  />
                  <input type="hidden" name="opportunityType" value={o.type} />
                  <select
                    name="status"
                    defaultValue={o.verification}
                    className={fieldClass}
                  >
                    {["NEEDS_REVIEW", "VERIFIED", "NOT_APPLICABLE"].map((v) => (
                      <option value={v} key={v}>
                        {label(v)}
                      </option>
                    ))}
                  </select>
                  <input
                    name="note"
                    defaultValue={o.verificationNote ?? ""}
                    maxLength={500}
                    placeholder="Optional evidence note"
                    className={fieldClass}
                  />
                  <button className="border border-amber-300/40 px-4 text-sm text-amber-300">
                    Save
                  </button>
                </form>
              </details>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
