"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Grid2X2, List, Search } from "lucide-react";
import {
  ALLIANCES,
  INVESTMENT_STATUSES,
  PRIORITIES,
  RANKS,
  RARITIES,
  label,
  UNIT_TYPES,
} from "@/lib/constants";
import { priorityValue, rankValue, rarityValue } from "@/lib/order";
import { Badge, EmptyState, fieldClass } from "./ui";

type CharacterItem = {
  id: string;
  name: string;
  slug: string;
  faction: string;
  alliance: string;
  rarity: string | null;
  starLevel: number | null;
  characterLevel: number | null;
  rank: string | null;
  activeAbilityLevel: number | null;
  passiveAbilityLevel: number | null;
  priority: string;
  investmentStatus: string;
  isOwned: boolean;
  updatedAt: string;
  unitType: string;
};
export function RosterBrowser({ characters }: { characters: CharacterItem[] }) {
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [owned, setOwned] = useState(true);
  const [filters, setFilters] = useState({
    alliance: "",
    faction: "",
    rarity: "",
    rank: "",
    priority: "",
    investmentStatus: "",
    unitType: "",
    sort: "name",
  });
  const factions = [...new Set(characters.map((c) => c.faction))].sort();
  const results = useMemo(
    () =>
      characters
        .filter(
          (c) =>
            (!owned || c.isOwned) &&
            c.name.toLowerCase().includes(search.toLowerCase()) &&
            Object.entries(filters).every(
              ([key, value]) =>
                key === "sort" ||
                !value ||
                String(c[key as keyof CharacterItem]) === value,
            ),
        )
        .sort((a, b) => {
          switch (filters.sort) {
            case "rank":
              return rankValue(b.rank) - rankValue(a.rank);
            case "rarity":
              return rarityValue(b.rarity) - rarityValue(a.rarity);
            case "level":
              return (b.characterLevel ?? -1) - (a.characterLevel ?? -1);
            case "priority":
              return priorityValue(a.priority) - priorityValue(b.priority);
            case "updated":
              return +new Date(b.updatedAt) - +new Date(a.updatedAt);
            default:
              return a.name.localeCompare(b.name);
          }
        }),
    [characters, owned, search, filters],
  );
  const select = (key: string, values: readonly string[]) => (
    <select
      aria-label={key}
      className={fieldClass}
      value={filters[key as keyof typeof filters]}
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
      <div className="mb-4 grid gap-3 lg:grid-cols-[2fr_repeat(4,1fr)]">
        <label className="relative">
          <Search size={16} className="absolute top-4 left-3 text-zinc-600" />
          <input
            className={`${fieldClass} pl-10`}
            placeholder="Search character name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {select("alliance", ALLIANCES)}
        {select("rarity", RARITIES)}
        {select("priority", PRIORITIES)}
        {select("unitType", UNIT_TYPES)}
      </div>
      <details className="mb-5 border border-white/10 bg-white/[.02] p-3">
        <summary className="cursor-pointer text-sm text-zinc-400">
          More filters and sorting
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            aria-label="faction"
            className={fieldClass}
            value={filters.faction}
            onChange={(e) =>
              setFilters({ ...filters, faction: e.target.value })
            }
          >
            <option value="">All factions</option>
            {factions.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          {select("rank", RANKS)}
          {select("investmentStatus", INVESTMENT_STATUSES)}
          <select
            aria-label="sort"
            className={fieldClass}
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          >
            {[
              ["name", "Name"],
              ["rank", "Rank"],
              ["rarity", "Rarity"],
              ["level", "Level"],
              ["priority", "Priority"],
              ["updated", "Recently updated"],
            ].map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={owned}
              onChange={(e) => setOwned(e.target.checked)}
            />{" "}
            Owned only
          </label>
        </div>
      </details>
      <div className="mb-4 flex items-center justify-between text-sm text-zinc-500">
        <span>{results.length} records</span>
        <div className="flex border border-white/10">
          <button
            aria-label="Card view"
            className={`p-2 ${view === "cards" ? "bg-amber-300 text-black" : ""}`}
            onClick={() => setView("cards")}
          >
            <Grid2X2 size={16} />
          </button>
          <button
            aria-label="Table view"
            className={`p-2 ${view === "table" ? "bg-amber-300 text-black" : ""}`}
            onClick={() => setView("table")}
          >
            <List size={16} />
          </button>
        </div>
      </div>
      {!results.length ? (
        <EmptyState
          title="No matching records"
          description="Try clearing a filter or adding a new character."
        />
      ) : view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {results.map((c) => (
            <Link
              data-testid="character-card"
              href={`/roster/${c.slug}`}
              key={c.id}
              className="group border border-white/10 bg-[#101618] p-5 hover:border-amber-300/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold group-hover:text-amber-300">
                    {c.name}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">{c.faction}</p>
                </div>
                <Badge value={c.alliance} />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 border-y border-white/10 py-4 text-sm">
                <div>
                  <small className="text-zinc-600">Rank</small>
                  <p>{label(c.rank)}</p>
                </div>
                <div>
                  <small className="text-zinc-600">Rarity</small>
                  <p>{label(c.rarity)}</p>
                </div>
                <div>
                  <small className="text-zinc-600">Level</small>
                  <p>{c.characterLevel ?? "—"}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge value={c.priority} />
                <Badge value={c.investmentStatus} />
                <Badge value={c.unitType} />
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                ★ {c.starLevel ?? "—"} · Active {c.activeAbilityLevel ?? "—"} ·
                Passive {c.passiveAbilityLevel ?? "—"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto border border-white/10">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-white/5 text-xs text-zinc-500">
              <tr>
                {[
                  "Character",
                  "Alliance",
                  "Rank",
                  "Rarity",
                  "Level",
                  "Priority",
                  "Investment",
                  "Unit type",
                ].map((h) => (
                  <th className="p-3 font-medium" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {results.map((c) => (
                <tr key={c.id} className="hover:bg-white/[.025]">
                  <td className="p-3">
                    <Link
                      className="font-medium hover:text-amber-300"
                      href={`/roster/${c.slug}`}
                    >
                      {c.name}
                    </Link>
                    <small className="block text-zinc-600">{c.faction}</small>
                  </td>
                  <td className="p-3">
                    <Badge value={c.alliance} />
                  </td>
                  <td className="p-3">{label(c.rank)}</td>
                  <td className="p-3">{label(c.rarity)}</td>
                  <td className="p-3">{c.characterLevel ?? "—"}</td>
                  <td className="p-3">
                    <Badge value={c.priority} />
                  </td>
                  <td className="p-3">{label(c.investmentStatus)}</td>
                  <td className="p-3">
                    <Badge value={c.unitType} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
