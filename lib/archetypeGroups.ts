import type { TournamentMeta } from "./types";

/** Map harmonized (or manual) archetype name → grouped label from `meta.archetypeGroups`. */
export function applyArchetypeGroups(
  label: string | null | undefined,
  groups: TournamentMeta["archetypeGroups"],
): string | null {
  const t = label?.trim();
  if (!t) return null;
  if (!groups || Object.keys(groups).length === 0) return t;
  for (const [groupName, members] of Object.entries(groups)) {
    if (members.includes(t)) return groupName;
  }
  return t;
}
