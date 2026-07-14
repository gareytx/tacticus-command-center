import { saveCharacter } from "@/app/actions";
import {
  ALLIANCES,
  INVESTMENT_STATUSES,
  PRIORITIES,
  RANKS,
  RARITIES,
  label,
} from "@/lib/constants";
import { ButtonLink, Panel, fieldClass } from "./ui";

type CharacterFormData = {
  id: string;
  name: string;
  slug: string;
  faction: string;
  alliance: string;
  rarity: string | null;
  starLevel: number | null;
  redStarLevel: number | null;
  characterLevel: number | null;
  rank: string | null;
  rankProgress: number | null;
  activeAbilityLevel: number | null;
  passiveAbilityLevel: number | null;
  shardsOwned: number | null;
  shardsRequired: number | null;
  priority: string;
  investmentStatus: string;
  notes: string | null;
  portraitUrl: string | null;
  isOwned: boolean;
};
export function CharacterForm({
  character,
  error,
}: {
  character?: CharacterFormData;
  error?: string;
}) {
  const action = saveCharacter.bind(null, character?.id);
  const input = (
    name: keyof CharacterFormData,
    labelText: string,
    type = "number",
    min = 0,
    max = 99999,
  ) => (
    <label className="text-sm text-zinc-400">
      {labelText}
      <input
        className={fieldClass}
        type={type}
        name={name}
        defaultValue={String(character?.[name] ?? "")}
        min={min}
        max={max}
      />
    </label>
  );
  const select = (
    name: keyof CharacterFormData,
    labelText: string,
    values: readonly string[],
  ) => (
    <label className="text-sm text-zinc-400">
      {labelText}
      <select
        className={fieldClass}
        name={name}
        defaultValue={String(
          character?.[name] ??
            (name === "priority"
              ? "MEDIUM"
              : name === "investmentStatus"
                ? "MAINTAIN"
                : ""),
        )}
      >
        <option value="">Unknown</option>
        {values.map((v) => (
          <option key={v} value={v}>
            {label(v)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <form action={action} className="space-y-5">
      {error && (
        <div
          role="alert"
          className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}
      <Panel>
        <h2 className="mb-5 text-lg font-semibold">Identity</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {input("name", "Character name", "text")}
          {input("slug", "URL slug", "text")}
          {input("faction", "Faction", "text")}
          {select("alliance", "Alliance", ALLIANCES)}
          <label className="flex items-center gap-3 text-sm text-zinc-400">
            <input
              type="checkbox"
              name="isOwned"
              defaultChecked={character?.isOwned ?? true}
            />{" "}
            Owned character
          </label>
        </div>
      </Panel>
      <Panel>
        <h2 className="mb-5 text-lg font-semibold">Progression</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {select("rarity", "Rarity", RARITIES)}
          {select("rank", "Rank", RANKS)}
          {input("rankProgress", "Rank progress (%)", "number", 0, 100)}
          {input("starLevel", "Star level", "number", 0, 11)}
          {input("redStarLevel", "Red star level", "number", 0, 5)}
          {input("characterLevel", "Character level", "number", 1, 60)}
          {input("activeAbilityLevel", "Active ability level", "number", 1, 60)}
          {input(
            "passiveAbilityLevel",
            "Passive ability level",
            "number",
            1,
            60,
          )}
          {input("shardsOwned", "Shards owned")}
          {input("shardsRequired", "Shards required")}
        </div>
      </Panel>
      <Panel>
        <h2 className="mb-5 text-lg font-semibold">Investment orders</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {select("priority", "Priority", PRIORITIES)}
          {select("investmentStatus", "Investment status", INVESTMENT_STATUSES)}
          <label className="text-sm text-zinc-400 md:col-span-2">
            Portrait URL{" "}
            <span className="text-zinc-600">
              (user-supplied or licensed images only)
            </span>
            <input
              className={fieldClass}
              type="url"
              name="portraitUrl"
              defaultValue={character?.portraitUrl ?? ""}
            />
          </label>
          <label className="text-sm text-zinc-400 md:col-span-2">
            Notes
            <textarea
              className={`${fieldClass} min-h-32`}
              name="notes"
              defaultValue={character?.notes ?? ""}
            />
          </label>
        </div>
      </Panel>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <ButtonLink
          secondary
          href={character ? `/roster/${character.slug}` : "/roster"}
        >
          Cancel
        </ButtonLink>
        <button
          className="min-h-10 border border-amber-300 bg-amber-300 px-5 py-2 text-sm font-medium text-black hover:bg-amber-200"
          type="submit"
        >
          Save character
        </button>
      </div>
    </form>
  );
}
