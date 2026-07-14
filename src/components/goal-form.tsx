import { saveGoal } from "@/app/actions";
import {
  GOAL_STATUSES,
  PRIORITIES,
  RANKS,
  RARITIES,
  label,
} from "@/lib/constants";
import { fieldClass } from "./ui";
export function GoalForm({
  characterId,
  characterSlug,
}: {
  characterId: string;
  characterSlug: string;
}) {
  return (
    <form action={saveGoal} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="characterId" value={characterId} />
      <input type="hidden" name="characterSlug" value={characterSlug} />
      {[
        ["targetRank", "Target rank", RANKS],
        ["targetRarity", "Target rarity", RARITIES],
        ["priority", "Priority", PRIORITIES],
        ["status", "Status", GOAL_STATUSES],
      ].map(([name, title, values]) => (
        <label className="text-sm text-zinc-400" key={String(name)}>
          {String(title)}
          <select
            required={name === "priority" || name === "status"}
            name={String(name)}
            className={fieldClass}
            defaultValue={
              name === "priority"
                ? "MEDIUM"
                : name === "status"
                  ? "PLANNED"
                  : ""
            }
          >
            <option value="">Not set</option>
            {(values as readonly string[]).map((v) => (
              <option key={v} value={v}>
                {label(v)}
              </option>
            ))}
          </select>
        </label>
      ))}
      {[
        ["targetCharacterLevel", "Character level"],
        ["targetActiveAbilityLevel", "Active ability"],
        ["targetPassiveAbilityLevel", "Passive ability"],
      ].map(([name, title]) => (
        <label className="text-sm text-zinc-400" key={name}>
          {title}
          <input
            className={fieldClass}
            type="number"
            name={name}
            min="1"
            max="60"
          />
        </label>
      ))}
      <label className="text-sm text-zinc-400 sm:col-span-2">
        Reason
        <textarea className={fieldClass} name="reason" />
      </label>
      <button
        className="border border-amber-300 bg-amber-300 px-4 py-2 text-sm font-medium text-black sm:col-span-2"
        type="submit"
      >
        Add upgrade goal
      </button>
    </form>
  );
}
