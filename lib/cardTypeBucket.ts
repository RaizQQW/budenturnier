import type { ParsedDeckLine } from "@/lib/types";
import { cardNameKey } from "@/lib/parseDecklist";

/** Coarse card-type bucket for deck composition (one bucket per physical card). */
export type DeckStatCardBucket =
  | "Land"
  | "Creature"
  | "Planeswalker"
  | "Battle"
  | "Instant"
  | "Sorcery"
  | "Enchantment"
  | "Artifact"
  | "Other";

/** Display / iteration order for UI. */
export const DECK_TYPE_BUCKET_ORDER: readonly DeckStatCardBucket[] = [
  "Land",
  "Creature",
  "Planeswalker",
  "Battle",
  "Instant",
  "Sorcery",
  "Enchantment",
  "Artifact",
  "Other",
] as const;

/** Front face only — used for MDFCs / adventures (matches decklist grouping). */
export function firstFaceTypeLine(typeLine: string): string {
  const i = typeLine.indexOf(" // ");
  return i === -1 ? typeLine : typeLine.slice(0, i);
}

/**
 * Single primary bucket from Scryfall `type_line` (first face only for MDFCs).
 * Mutually exclusive: e.g. Artifact Creature → Creature; Basic Land → Land.
 */
export function primaryTypeBucket(typeLine: string): DeckStatCardBucket {
  const t = firstFaceTypeLine(typeLine).trim();
  if (!t) return "Other";
  if (/\bLand\b/.test(t)) return "Land";
  if (/\bCreature\b/.test(t)) return "Creature";
  if (/\bPlaneswalker\b/.test(t)) return "Planeswalker";
  if (/\bBattle\b/.test(t)) return "Battle";
  if (/\bInstant\b/.test(t)) return "Instant";
  if (/\bSorcery\b/.test(t)) return "Sorcery";
  if (/\bEnchantment\b/.test(t)) return "Enchantment";
  if (/\bArtifact\b/.test(t)) return "Artifact";
  return "Other";
}

function emptyCounts(): Record<DeckStatCardBucket, number> {
  return {
    Land: 0,
    Creature: 0,
    Planeswalker: 0,
    Battle: 0,
    Instant: 0,
    Sorcery: 0,
    Enchantment: 0,
    Artifact: 0,
    Other: 0,
  };
}

/**
 * Count cards in `lines` for one board by primary type bucket.
 * Unresolved names or missing `type_line` in `oracleTypes` count as Other (qty preserved).
 */
export function countDeckByType(
  lines: ParsedDeckLine[],
  resolvedOracleIds: Record<string, string>,
  oracleTypes: Record<string, string>,
  board: "main" | "side",
): Record<DeckStatCardBucket, number> {
  const out = emptyCounts();
  for (const line of lines) {
    if (line.board !== board) continue;
    const oid = resolvedOracleIds[cardNameKey(line.name)];
    const typeLine =
      oid != null ? (oracleTypes[oid] ?? "") : "";
    const bucket = primaryTypeBucket(typeLine);
    out[bucket] += line.qty;
  }
  return out;
}
